# Changelog

All notable changes to CanvasCore are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the version stays at `0.x`, the API and formats may change from one
minor to the next: `MINOR` signals new features, `PATCH` fixes.

## [Unreleased]

### Added
- **Menu Builder reorganized into tabs** (Structure, Themes, Style, Effects, Layout & Logo, Mobile) with
  the live preview pinned on top and a Desktop/Mobile switch to check the hamburger menu.
- **12 menu themes**: Classic, Professional, Fresh, Warm, Midnight, Minimal, Ocean, Sunset, Earth, Pastel,
  Bold and Corporate. A theme sets colors, item shape, typography and effects in one click, keeps the links,
  logo, alignment and mobile settings, can be undone, and is marked "In use" until you customize it.
- **Stackable menu effects** (`settings.effects`, replacing the single `effect`): 22 effects in 7 groups:
  hover indicator (underline, center underline, overline, highlight, dot), hover motion (lift, grow, pop),
  hover glow (text glow, shadow), bar (glass, glare, accent line), on scroll for sticky bars (shrink,
  hide on scroll down, shadow), submenu opening (fade, slide, zoom) and page load (slide down, fade in,
  stagger). Effects in different groups combine; "pick one" groups keep a single effect. Menus saved with
  the old `effect` keep working. Animations are turned off for visitors who prefer reduced motion.
- Menu typography (font size, weight, letter case, letter spacing), a button text color for the pill/box
  styles (it was always white), and an optional highlight of the current page (`aria-current` is always set).
- **Mobile menu options** (Mobile tab): 8 burger icons (classic, staggered, two lines, thin, bold, dots,
  grid, boxed) plus "icon + Menu" and a custom character; the burger turns into ✕ while the menu is open
  (`aria-expanded` is kept in sync). The burger can sit on the left, with the logo moving to the right,
  and the logo can be hidden on mobile only.
- `tests/menu.mjs` (`npm run test:menu`, part of `npm test`): keeps the effect catalog in sync between the
  editor and the compiler and renders every theme and effect through the PHP compiler.
- **Setup wizard** (`canvascore-admin/install.php`): checks the server requirements (PHP,
  extensions, writable folders, data dir inside/outside the web root, editor build, `mail()`, HTTPS),
  creates the DB with the existing migrations, an administrator account that replaces the default
  `admin`/`admin`, the site name and address, the email for forms and an optional homepage from a starter
  (created as a draft). Signs you in to the editor automatically at the end of the installation. CSRF-protected;
  it locks itself once the site is already installed (including installs that predate the wizard) and offers to
  delete itself from the server.
- **8 new starter page templates**, available from "Start from a template" and in the installer:
  Services, Pricing, Portfolio, Team, FAQ, Coming Soon, Local Business and Event. They use the newer
  blocks (Steps, Pricing, Data table, Accordion, Gallery, Counters, Logo cloud, Team, Timeline,
  Countdown, Business details, Map).
- `tests/starters.mjs` (`npm run test:starters`, part of `npm test`): checks every starter for unknown
  block types, misspelled content fields and duplicate ids, and renders each one in both the editor
  renderer and the PHP compiler.
- **Unique URLs site-wide**: a page can't be published on a URL already used by another live page,
  a collection or a system folder (`uploads`, `canvascore-admin`), and a collection item can't reuse a
  published item's slug in the same collection. The server refuses with a clear message; drafts can
  still be saved. Page Info warns as you type, and new pages (blank or from a template) get a free
  slug automatically (`new-page`, `new-page-2`…).

### Fixed
- Mobile menu with **center or right** button alignment: the burger no longer ends up in the middle and the
  centered logo no longer floats over the open menu; on mobile the bar always puts logo and burger at the edges.
- Menu accent line drawn over the open submenus.
- **Mobile menu always open**: the menu list's inline `display:flex` beat the mobile CSS, so on phones the
  items were always shown and the burger could not close them (on the site and in the preview).
- Menu Builder preview with "Fixed on top": the menu no longer slides down after each change. The preview now
  renders the bar exactly as on the site, over a sample page you can scroll to try "Fixed on top" and the
  scroll effects.
- **Templates**: a page created from a template kept the slug `new-page` instead of following its
  title like a new blank page; it now starts as e.g. `coming-soon`.
- **Editor canvas**: padded full-width blocks (forms, icon boxes, testimonials…) overflowed their box in
  the editor while looking right on the site. The canvas now uses the same `box-sizing: border-box`
  as the published pages.
- **Editor**: opening the Advanced tab on a section or container that came from a starter template
  blanked the whole editor (admins only). Template blocks have no `content` object and the panel read
  it directly; the panel now always gets `content`/`styles` objects. Affected every starter, including
  Landing, About and Contact.
- **Publishing**: `rebuild_all.php` read the global settings before loading them, so the menu's
  "inherit the theme" option (hover color = brand color) was ignored on the published site even though it
  worked in the preview, and the same applied to disabling the global header/footer
  (`headerEnabled` / `footerEnabled`).

## [0.13.0] - 2026-10-07 — 12 new blocks

### Added
- **Divider**: line, gradient line, dots, wave/curve/diagonal (SVG, can also be flipped) and spacer.
- **Callout**: Info / Success / Warning / Danger / Note box with a title and rich text (sanitized).
- **Steps**: numbered steps laid out horizontally (with connectors) or vertically; on mobile they become vertical.
- **Counters** (animated counters): numbers that count up when they scroll into view. The final value is already
  in the HTML (useful without JS and for search engines); the animation respects `prefers-reduced-motion`.
- **Progress bars**: accessible bars (`role="progressbar"`), color per bar, fill on entry.
- **Data table**: paste from Excel/Google Sheets (cells separated by `|` or Tab); header row, first column
  as a row header, striped rows, borders, compact, sticky header with scroll; responsive.
- **Countdown**: visitor's local time or a fixed UTC offset; final message or hidden block;
  the date is readable even without JS (`<time>`).
- **Timeline**: vertical on the left or alternating (from 769 px up).
- **Logo cloud**: grid or continuously scrolling strip (CSS only, pauses on hover, stops with
  `prefers-reduced-motion`, the duplicated set is hidden from screen readers and the keyboard), grayscale with color on hover.
- **Team**: person cards with photo or initials, role, bio and links (email, LinkedIn, X, website).
- **Before/After**: comparison with a draggable handle, keyboard accessible (`input range`);
  interactive in the editor canvas too.
- **Business info**: address, phone, email, website, directions button (Google Maps), opening hours table and
  **schema.org LocalBusiness** structured data (JSON-LD) for Google, with validated days and hours.
- Configuration panels for all the blocks (reordering ↑/↓, adding/removing items, media picker for
  logos, team photos and before/after images) and a "CONTENT BLOCKS" group in the ADD panel.

### Changed
- Colors and numbers of the new blocks go through validators shared by PHP and JS: only "safe" CSS values
  (no `;`, `{}`, `url()`), numbers clamped to sensible ranges.
- Counters use explicit rounding that is identical in PHP and JS (neither `number_format` nor `toFixed`
  agree on cases like 2.675): the editor and the site always show the same number.
- The property panel reads the content from the store and not from the copy of the last render: two quick
  edits in a row no longer overwrite each other (pre-existing defect, found by the new tests).
- The parity test includes the 12 blocks (variants and edge cases, real defaults from `blocks.json`) and also
  compares the text of the `<style>` tags.

### Notes
- No DB migration; `content_schema` unchanged. No additional PHP dependency: **mbstring is not
  required** (it is not always installed; an `mb_strtoupper` in the first version would have broken publishing).
- Countdown: a fixed UTC offset does not follow daylight saving time; for "midnight for everyone" deadlines use local time.
- Business info: the structured data is published only if there is a name; there is no "open now" indicator.
- In the editor canvas, counters, bars and countdowns show their final state (the scripts only run on the
  published page); Before/After, on the other hand, is interactive.
- `master.html` uses `IntersectionObserver` without a check (pre-existing "reveal" script): irrelevant in
  current browsers, only visible in test environments such as jsdom.
- Tests: `npm test` now also runs `test:content` (149 checks on the compiler, including scripts executed in
  jsdom and JSON-LD) and `test:panels` (71 checks: real panels and canvas mounted in jsdom).
## [0.12.0] - 2026-10-06 — Expired session: work kept safe, no false successes

### Added
- **Deterministic server-side inactivity timeout** (previously expiry depended on PHP's garbage
  collector, ~24 min and unpredictable). Default 30 minutes, configurable in Global Options →
  Security (5–720 min). Working in the interface counts as activity: someone editing for a long time without
  saving is not signed out, someone who is really idle expires on time.
- **Immediate expiry detection**: read-only polling (`session_status`, does not extend the
  session), a check when returning to the tab / resuming from sleep / getting the network back, and a non-blocking
  warning ~2 minutes before expiry with "Stay signed in".
- **Login over the app**: on expiry a login screen appears that covers the interface, which
  stays mounted and inert with all its state (menu, settings, editor). After logging in you pick up
  exactly where you left off.
- **Failed requests are completed**: a save/publish interrupted by expiry
  is kept waiting and re-run ONCE after logging back in, with the new CSRF token.
- **Automatic local backup of unsaved work** (page, item, header/footer and master editors;
  Menu Builder; Global Options), per user, in the browser. After a refresh or a new session
  "Unsaved work found" is offered with Restore/Discard; the login page explains that the session expired.
- Save status in the editor ("All changes saved" / "Unsaved changes · backed up on this device")
  and a confirmation when leaving the editor with unsaved changes.
- `session_status` (read-only) and `keepalive` endpoints.

### Fixed
- **False successes**: "Draft saved!", "Menu saved…" and "Global options saved…" appeared even with
  a 401/error response. Now the outcome is real; publishing does not start if saving fails.
- Saving a **master** with an error discarded the changes with "updated globally": now you stay
  in edit mode.
- A POST with an expired session got a 403 (CSRF) instead of a 401: now the login check comes before
  the CSRF one. A 403 for an expired CSRF token with a valid session repairs itself.
- On a 401 the app unmounted and lost the components' state.
- Logging out without a network stopped halfway and left work state behind for the next user.
- If a different user logs in on expiry, the tab does not take on their identity, does not run the pending
  requests on their behalf and does not write the other user's backups into their account (found by the tests).

### Changed
- PHP sessions live in a dedicated folder (`<data>/sessions`, permissions 0700) with
  `use_strict_mode`: expiry no longer depends on the GC of other applications on the server.
- The APIs respond with `Cache-Control: no-store`.

### Notes
- On the first update all users will have to log in again once (the sessions folder changes).
- Backups are per browser and per user (they don't follow the user to another device) and are
  deleted after 14 days. There is no conflict detection if someone else edits the same page
  in the meantime.
- Tests: `npm test` now also runs the session tests (150 checks: backups, trackers, manager with a fake
  server and simulated clock, fetch guard) and the integration test on the real interface (49 checks:
  the real `App` in jsdom). Verified with mutation testing (bugs planted on purpose, all detected).
## [0.11.0] - 2026-10-06 — New blocks: Accordion, Tabs, Pricing, Gallery

### Added
- **Accordion**: items with rich (HTML) content, Cards/Flat style, icon
  (+ / ▾ / none), first item open, *exclusive* mode (only one open) or
  *multiple*. Uses `<details>`: works without JavaScript. (The **FAQ** block
  remains for plain-text questions/answers.)
- **Tabs**: tabs with rich content, Underline/Pills style, left/center/right
  alignment. Implemented in CSS only (radio + `:checked`): no
  JavaScript, they work even with JS disabled and can be navigated with the arrow keys.
- **Pricing**: plans with name, price, period, description, feature list
  (one per line), button (URL, `mailto:`, or a site page), a
  **highlighted** plan with a badge. Automatic columns (max 4), 1 column on mobile.
- **Gallery with lightbox**: *Grid* layout (uniform thumbnails with the chosen
  ratio) or *Masonry* (natural ratios), 1–6 columns, gap, rounded corners,
  optional captions. Lightbox with previous/next, keyboard (←/→/Esc),
  swipe on touch, click on the backdrop, focus trapped and restored; without
  JavaScript the image still opens (direct link). Images can be added
  from the Media Manager.
- Configuration panels with reordering (↑/↓), removing and adding items.
- Accordion and Tabs are interactive in the editor canvas too.
- Behavioral tests (`npm run test:blocks`, included in `npm test`): Tabs
  logic evaluated on the elements actually selected by the CSS, lightbox executed
  in jsdom, sanitization, exclusive/multiple accordion, Pricing URLs.

### Changed
- The parity test now also compares the text of the `<style>` tags for the blocks
  whose CSS carries logic (Accordion, Tabs, Pricing, Gallery) and includes the real
  defaults from `blocks.json`. Previously the `<style>` tags were ignored: a regression in the
  Tabs logic would have gone unnoticed.
- New devDependency: `jsdom` (tests only).

### Notes
- No DB migration; `content_schema` unchanged (the new types are additive).
- The content of the Accordion/Tabs panels is edited as text/HTML in the
  side panel (like Grid/Cards), not with the inline visual editor.
- Rich content is sanitized server-side (scripts, `on*`, `javascript:`).
## [0.10.1] - 2026-10-06

### Fixed
- **Items' "Archived" state not kept**: the item editor did not load
  the flag (the checkbox always started empty) and every save sent
  `archived: 0`, wiping the state set from the list. Now the editor loads
  the real value and saves it correctly.
- The backend no longer resets the flag when a save does not include it: if the
  `archived` key is missing, the value already saved is **kept**.
- The Archive/Restore toggle in the list used a JS truthiness test that, with
  a `"0"` value (a string, as returned by some versions of PHP/PDO), never
  archived. Now `get_item`/`get_items` always return an integer and the
  toggle compares numerically.

### Added
- After archiving/restoring from the list a notice appears with a
  **Publish now** button: public lists (Collection List) are generated at
  build time, so they update on the next publish. No
  automatic republishing (so as not to publish changes that have not been confirmed yet).
## [0.10.0] - 2026-10-06 — Blog: archive, cover, list, "show all"

### Added
- **Archiving items**: every item has an **Archived** flag. An archived
  article stays published and reachable, but leaves the main list.
  The Collections section has an "archived" badge and a quick button to
  archive/restore.
- **Item Settings** in the item editor: you can finally set the **cover
  image** (with upload), **excerpt**, **date**, **status** and **Archived**.
- **Collection List** block extended:
  - **Source**: Active (not archived) / Archived only / All — a single block
    covers both the home page and the archive page (no duplicate block);
  - **Layout**: Grid (cards) or **List** (rows, ideal with many articles);
  - **Show all**: ignores the limit and shows all items (e.g. an archive page).
    The limit is still useful for "latest N" (e.g. 3 on the home page).

### Changed
- **DB migration v5**: `collection_items.archived` column. Automatic.

### Design notes
I preferred a single `COLLECTION_LIST` with a *Source* option over a separate
`ARCHIVE_LIST` block: just one block to maintain, and more flexible. Real
pagination (pages /2, /3…) remains a possible future step; with "Show all"
on a dedicated archive page the full history is accessible anyway.
## [0.9.1] - 2026-10-06 — Blog / Collections (part 2: list block)

### Added
- New **Collection List** block: lists a collection's published items
  on any page, as a grid of cards (cover, date, title, excerpt) with a
  link to the item's page. Configurable from the panel: collection, number of
  items, columns, and toggles for cover/date/excerpt. Responsive (1 column on mobile).
- The block is **dynamic**: at build time the compiler inserts the real items (sorted
  by date, published only); in the editor it shows a placeholder preview.

### Notes
- Being dynamic, it is excluded from the static parity test (like Masters).
- With this the blog is "browsable": you create the collection and its items (0.9.0) and put
  a Collection List on the home page or an archive page to list them.
## [0.9.0] - 2026-10-06 — Blog / Collections (part 1)

### Added
- **Collections**: repeatable content types (Blog, Portfolio, …) with multiple
  items. New **Collections** section in the dashboard:
  - creating/deleting collections (admin);
  - items with title, slug, excerpt, cover, date, status (draft/published), SEO;
  - every item is edited with the **same block editor** as pages.
- **Static generation of items**: every published item becomes a page
  `/<collection>/<item>/index.html`, with menu, global header/footer, OpenGraph
  meta (type=article, cover as the social image) and inclusion in the sitemap.
- Endpoints: `get_collections`, `save_collection`, `delete_collection` (admin),
  `get_items`, `get_item`, `save_item`, `delete_item`.

### Changed
- **DB migration v4**: `collections` and `collection_items` tables. Applied
  automatically (verified on new and existing DBs).
- Removed the Header/Footer buttons from the dashboard (they are now in Global Options).

### Next (part 2)
- An "item list / archive" block to place on any page (e.g. the list
  of blog posts), with cards, excerpts and links to the items.
## [0.8.1] - 2026-10-06

### Added
- In **Global Options** → "Global Header & Footer": switches to
  **enable/disable** the global header and footer (when disabled they are not
  shown on any page), plus **Edit** and **Delete** buttons for
  each. Delete removes all the blocks of that part.
- `delete_part` endpoint (empties the header or footer).
## [0.8.0] - 2026-10-05 — Global header/footer

### Added
- **Global header and footer**: two block areas (built with the same editor)
  applied automatically to **all** published pages — the header before the
  content, the footer after it, both full width.
- Dashboard: **Header** and **Footer** buttons to open them in the editor; "code"
  blocks remain reserved to admins (server-side stripping here too).
- Site export/import now also include the header and footer.

### Changed
- **DB migration v3**: new `site_parts` table (header/footer). Applied
  automatically by the migration runner (verified on new and existing DBs).
## [0.7.3] - 2026-10-05 — UI refresh (pass 2): editor

### Changed
- **Denser, more premium editor**:
  - the blocks in the add panel are now in a **2-column grid** of
    compact tiles (icon + short label), much denser and tidier than
    the full-width list;
  - narrower side panels (left 270→250, right 320→300) to give the canvas more
    room;
  - floating bar, accordions, property panel header and Save/Publish bar
    with tighter spacing;
  - less padding around the canvas (more working area).
- Shorter block labels (Section, Container, Cards, Video, Form, FAQ,
  Slider, Maps, Image…) for clarity and density.
## [0.7.2] - 2026-10-05 — UI refresh (pass 1 rev.): high density & dashboard

### Changed
- **Much higher density** across the whole admin interface: tighter container
  padding and **more compact input fields/labels** (smaller height and font)
  in the form-heavy screens (Global Options, Menu Builder,
  Property Panel, Accounts) — more information on screen on a 14" FHD display.
- **Reorganized dashboard**: the user pill (name + role) is now at the top
  left with the **Logout** button next to it; the primary actions (New Page,
  Publish All) at the top right; the secondary navigation (Templates, Media,
  Menu, Global Options, Submissions, Accounts, Export, Import) in a dedicated compact
  bar. Smaller, more elegant buttons.
- The "Account" button is now **"Accounts"**.
## [0.7.1] - 2026-10-05 — UI refresh (pass 1): density & premium

### Added
- Global UI base (`src/ui/global.css`) with a shared palette and **design tokens**,
  thin scrollbars, improved text rendering, selection and a soft entrance.
  It deliberately leaves generic elements alone so as not to alter the canvas
  preview.

### Changed
- **Reduced density** across the whole admin interface to make better use of
  small screens (14" FHD): padding of the main containers, of the dashboard
  (header, toolbar, rows), of the editor (bar, panels) and of the DOM Navigator
  slightly tighter, while keeping breathing room and readability.
## [0.7.0] - 2026-10-05 — SEO/publishing & advanced forms

### Added
- **SEO & publishing**: automatic generation of `sitemap.xml`, `robots.txt`
  and a `404.html` page on every build; per-page **OpenGraph/Twitter** meta
  (title, description, image, url, site name) and **favicon** in the `<head>`;
  `ErrorDocument` for Apache. New options in Global Options: Site URL, Site
  Name, Favicon, default social image, indexing toggle (robots).
- **Per-page social (OG) image** field in the SEO panel.
- **Advanced forms**: every submission is **stored in the database**; new
  **Submissions** section (admin) to browse them, with **CSV export** and deletion.
  Built-in **honeypot** anti-spam in the forms (bot submissions are discarded).
- Endpoints: `get_submissions`, `export_submissions`, `delete_submission`,
  `clear_submissions` (admin).

### Changed
- **DB migration v2** (the first beyond the baseline): `pages.seo_image` column and
  `form_submissions` table. Applied automatically by the migration runner
  (verified idempotent, on new and existing DBs).
- Form submissions are stored **even** if email is not configured.

### Notes
- The sitemap uses absolute URLs if you set "Site URL" in Global Options.
- Site export/import now also include `seo_image`.
## [0.6.1] - 2026-10-05

### Changed
- Removed "Pro" from the product name (login screen) and from the
  "Custom Code" label in the property panel.
- Swapped the icons of the Export/Import buttons in the dashboard.

### Added
- In the dashboard's page list, a button to **open the page in a
  new browser tab** (opens the published version).
- A small UI touch: wider actions column and hover on the page list rows.
## [0.6.0] - 2026-10-05 — Step C: templates & import/export

### Added
- **Starter templates**: new "Templates" section in the dashboard
  with ready-made pages (Blank, Landing Page, About, Contact). Choosing one
  creates a new, fully editable draft page. The templates are in
  `canvascore-admin/starters.json` (easy to extend).
- **Export site**: the admin can download a full backup of the site in a single
  JSON file (pages, menu, settings, masters, templates) + a media manifest.
- **Import site**: the admin can restore/replace the site from an export
  file (user accounts are NOT touched). The import runs in a transaction and
  applies any content migrations.
- Endpoints: `get_starters`, `export_site` (admin), `import_site` (admin).

### Notes
- Export/import cover structure and configuration. The media files in `/uploads`
  must be copied separately when moving the site to another server (the manifest
  in the export lists the referenced files). For backup/restore on the same
  server, the media stay where they are and the restore is complete.
- Export→edit→import round trip verified: the site is restored
  identically (pages, homepage, menu, settings).
## [0.5.1] - 2026-10-05

### Fixed
- **FAQ and FORM were not rendered in the editor canvas** (they appeared as
  "Unknown element") while they were correct on the compiled page: they were missing from the
  canonical JS renderer. Added and now covered by the parity test.
- **Flex Row and CSS Grid in the editor canvas**: child blocks did not
  size/align correctly. The selection/drag frame now
  carries the sizing/positioning properties (width, flex, grid, margin, ...),
  behaving like the real item, while the canonical content neutralizes them
  (no double application). Flex/grid in the editor match the site.
- **Slider in the editor canvas**: it now animates both the fade effect and the
  slide effect, driving the canonical DOM. Previously they were static in the editor.
- **DOM Navigator**: dragging downwards did not work (you could only
  drag upwards). Reordering among siblings is now directional (arrayMove),
  so it works in both directions.

### Added
- Parity test extended with FAQ, FORM and **cross cases** (Flex Row and CSS Grid
  with nested blocks inside): 23 fixtures, all green.
## [0.5.0] - 2026-10-05

### Added
- **Cross-container drag & drop**: in the canvas you can now move
  elements between different containers/sections and into the cells of CSS Grid / Simple
  Grid, as well as reorder them. Dragging a block onto an empty container
  inserts it inside; dragging it onto another block makes it that block's sibling
  in the same position.
- **Drag & drop in the DOM Navigator** (left panel): every item has a
  drag handle, with reordering and re-nesting between containers/sections.
- Unified, cycle-safe tree move (`moveBlock`): prevents moving
  a block inside one of its own descendants.

### Notes
- Move logic verified in isolation on all cases (cross-container,
  empty containers, reordering, cycle prevention, moving subtrees).
- The precision of the drop "target" in the canvas depends on dnd-kit's collision
  detection: for precise re-nesting the DOM Navigator is the handiest tool.
## [0.4.0] - 2026-10-05

### Changed
- **Phase 2 closed — editor wired to the canonical renderer.** The editor no longer has
  its own separate rendering implementation: visual items (images,
  buttons, sliders, cards, grids, icons, testimonials, videos, maps, HTML) and
  content not being edited are shown with the **same HTML as the published
  site** (`renderBlock.mjs` renderer). Containers use `blockRoot`, the single
  source shared with the compiler for the root element. React code remains only
  for inline editing (Jodit) of text blocks while they are selected.
- As a result the canvas preview matches the compiled page (including
  button alignment, slider/image aspect ratio, etc.).

### Added
- `blockRoot()` in the canonical renderer: description of a block's root
  element, shared between the editor (React) and the compiler.

### Fixed
- The parity test now normalizes styles semantically (irrelevant spacing
  around `:` and `,`), so it compares real CSS equivalence.

### Notes
- The published output (PHP compiler) does not change and is covered by the parity test
  (`npm run test:parity`), still green on all 19 blocks.
## [0.3.2] - 2026-10-04

### Fixed
- The menu's text color and hover color were not applied to the top-level
  items (only to submenus) and the hover background was never applied: a specificity
  conflict with the theme's global rules. Now the menu is **authoritative**
  (it uses !important on its own colors) and the legacy menu rules have been removed
  from the template, so the configured colors always win.
- "Logo / buttons gap": in the real menu the spacing was not applied because a
  `margin:0` on the list reset the `margin-left`. Fixed the order of the styles.

### Added
- **Authentic preview** in the Menu Builder: it is now generated by the real compiler and
  shown in an isolated iframe, so it is identical to the published menu (hover,
  effects, logo, layout). Links are made inert.
- Global settings: **"Let the menu inherit the global brand color on
  hover"** flag (default OFF). Off, the menu uses only the colors set in the Menu
  Builder; on, hover uses the global brand color.

### Changed
- Removed the legacy menu CSS rules from the template (`master.html`): all of the
  menu styling is now generated by the Menu Builder, with no conflicts.
## [0.3.1] - 2026-10-04

### Fixed
- The menu colors (text, hover text, hover background) did not change:
  they were overridden by global template rules with higher specificity.
  Now the menu rules are prefixed with `.cc-navigation` and take
  precedence.
- "Sticky" menu not working: the template's `body { overflow-x: clip }` breaks
  `position: sticky`. The sticky menu now uses `position: fixed` (with automatic
  height compensation), so it really stays at the top.
- "Glare" effect: the shine clipped the submenus at the height of the bar.
  Now the sheen is on a dedicated overlay clipped to the bar only, so dropdowns are
  no longer cut off.

### Added
- Menu Builder: the "Item border" field now has a dropdown with presets
  (none, thin, solid, dashed, dotted) in addition to the Custom option.
- Menu Builder: the "Item radius" field can be adjusted with the up/down arrow keys.
- Menu Builder: besides a URL, the logo can be uploaded directly,
  and the file ends up in the Media Manager.
- The upload endpoint returns the URL of the uploaded file.

## [0.3.0] - 2026-10-04

### Added
- Menu Builder rewritten on a **nested tree model** (children) with
  a live preview and **drag & drop** reordering among items at the same level;
  the ⇥/⇤ buttons nest/un-nest an item as a submenu.
- Menu items **without a link**: leaving the URL empty, the top-level item only opens
  its own submenu (useful when there is no page for the parent level).
- Multi-level submenus (sub-submenus too) with cascading dropdowns.
- Extended menu customization: item borders, spacing between items,
  text color, text/background color on mouse hover, bar height,
  background color with adjustable **opacity**, shadow (soft/medium/strong).
- Logo: image, height, alignment (left/right) **independent** of
  that of the buttons, with configurable spacing and the requested priority
  logic (same side = logo and buttons next to each other; opposite sides = at the edges).
- Selectable "premium" effects: animated underline, lift, glassmorphism
  (blur), glare (animated reflection).
- Dashboard: indicator of the logged-in user (name + role) at the top.

### Fixed
- Submenu bug: moving an item from one menu to another did not update the parent
  (flat model with parentId). With the new nested tree,
  reordering and nesting are consistent and persist correctly.

### Notes
- Backward compatibility: menus saved in the old flat format (parentId)
  are converted to a tree automatically, both in the editor and in the compiler.

## [0.2.1] - 2026-10-04

### Fixed
- A new user (e.g. an editor) created by the admin was not required to change
  their password at first login: now `add_user` sets `must_change_pw`, and
  a password reset by the admin (`force_password`) also forces the change at the
  user's next login.
- More robust CSRF token lifecycle across user switches: login aligns the
  double-submit cookie with the new session token and logout deletes it. This removes
  stale tokens between sessions of different users (the likely cause of POSTs
  being rejected after logging in as a different user in the same
  browser).

## [0.2.0] - 2026-10-04

### Added
- Automatic versioning: every `npm run build` increments a build number and
  stamps the date (`build`/`built` fields in version.json via `scripts/bump.mjs` +
  the `prebuild` hook). The version (build included) is shown in the panel.
- Foundations of the single rendering contract:
  - `canvascore-admin/blocks.json`: single source of truth for the block defaults
    (content + styles), consumed both by the editor (via Vite) and by PHP.
  - `src/render/renderBlock.mjs`: canonical renderer in pure JS, mirroring the
    PHP compiler.
  - Automatic parity test (`npm run test:parity`): compares the structure and
    styles produced by the JS renderer and the PHP compiler on a set of fixtures;
    it fails if they diverge.
- The editor's `addBlock` now builds blocks from `blocks.json` (no more
  duplicated, implicit defaults).

### Fixed
- ICON_BOX block: duplicated `style` attribute in the compiler (invalid HTML) that
  made the text alignment ineffective; now a single, correct attribute.
  (divergence detected automatically by the new parity test).
- Cleaned up a double `style` attribute on TESTIMONIAL too.

## [0.1.0] - 2026-10-04

First versioned release. It gathers the stabilization (Phase 0) and
security (Phase 1) work, brought to an advanced, stable and usable MVP.

### Added
- Versioning system: `version.json` as the single source of truth for the app
  version, DB schema and content schema; `?action=version` endpoint; version
  shown in the panel and injected into the frontend build; `<meta generator>`
  in the compiled pages.
- Versioned DB migration runner (`migrations.php`) with a `cc_meta` table,
  replacing the old stack of `ALTER ... try/catch` and converging both
  new and existing installations.
- Scaffold for content migrations (block format) and a
  `content_schema` column stamped on saved pages.
- Homepage management: exclusive "Set as Homepage" flag, published at the
  root whatever the slug.
- CSRF with a session token + double-submit cookie; hardened session
  (HttpOnly, SameSite=Lax, Secure over HTTPS).
- Forced password change at first login for the default admin.
- Data dir moved outside the web root (with a real write test and a
  bidirectional safety migration).
- XSS sanitization of rich-text content; "code" blocks (custom HTML/CSS)
  reserved to admins, with server-side removal for non-admins.
- Server-side registry of form recipients (`forms.json`): no more email addresses
  in the client, with per-form recipient restore.
- Auto-slug from the title for pages that have not been published yet.
- Real drag & drop of blocks (reordering among siblings at every level).

### Changed
- `api.php` and `rebuild_all.php` now use a shared module (`config.php`) for
  session, data dir, CSRF and sanitization.
- Media upload: image extension whitelist + MIME check; FPM-safe `.htaccess`
  that prevents scripts from running in `/uploads`.

### Fixed
- Publishing no longer worked (missing schema columns): the schema is now
  complete and migrated automatically.
- Draft → hidden copy → publish → discard flow aligned between frontend and
  backend.
- SQL injection in slug renaming (now a prepared statement) and path traversal
  in file generation (sanitized slug).
- Open relay in the form mailer; reflected XSS in the result message.
- Images not visible after upload (regression from `php_flag` in `.htaccess`
  on PHP-FPM).
- Saves failing with 403 on upgraded installations (fragile CSRF on the existing
  session) and the "can read but can't save" case caused by a non-writable data dir.
- Removed dead code and components that did not compile.

[Unreleased]: https://example.com/canvascore/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/canvascore/releases/tag/v0.1.0
