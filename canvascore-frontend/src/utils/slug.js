// Slug helpers shared by page creation, templates and the Page Info panel.
// A slug is a top-level URL: it belongs to one page or collection site-wide
// (the server enforces this on publish, see cc_slug_owner() in api.php).

// Converts a title to a slug: lowercase, dashes instead of spaces/characters, no accents.
export const slugify = (str) => (str || '')
  .toString()
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Folders the site already uses next to the published pages.
export const RESERVED_SLUGS = ['canvascore-admin', 'uploads'];

const isLive = (p) => ['published', 'modified'].includes(p.status);

// Who already uses `slug`, ignoring the page being edited (and its draft copy / parent).
// Returns { label: 'page “About”', live } or null when the slug is free. `live` owners block
// publishing on the server; a draft owner only means the two pages can't both be published.
export function slugOwner(slug, { pages = [], collections = [], pageId = null, parentId = null } = {}) {
  if (!slug) return null;
  if (RESERVED_SLUGS.includes(slug)) return { label: 'a system folder', live: true };
  const others = pages.filter((p) => !Number(p.is_draft_copy) && p.id !== pageId && p.id !== parentId
    && (p.clean_slug || p.slug) === slug);
  const page = others.find(isLive) || others[0];
  if (page) return { label: `page “${page.title || page.id}”`, live: isLive(page) };
  const col = collections.find((c) => c.slug === slug);
  if (col) return { label: `collection “${col.name}”`, live: true };
  return null;
}

// First free variant of `base`: base, base-2, base-3...
export function uniqueSlug(base, ctx = {}) {
  const root = slugify(base) || 'page';
  if (!slugOwner(root, ctx)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!slugOwner(candidate, ctx)) return candidate;
  }
}
