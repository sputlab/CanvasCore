// Where the page being edited is online (relative to canvascore-admin/), or null when it isn't published yet.
// A draft copy's live version is its parent page; header/footer show on the home page.
export function livePageUrl(p, pages, colSlug) {
  if (!p) return null;
  if (p.__part) return '../';
  if (p.__item) return p.status === 'published' && colSlug && p.slug ? `../${colSlug}/${encodeURIComponent(p.slug)}/` : null;
  const live = Number(p.is_draft_copy) === 1 ? (pages || []).find((x) => x.id === p.parent_id) : p;
  if (!live || !['published', 'modified'].includes(live.status)) return null;
  const slug = live.clean_slug || live.slug || '';
  return (Number(live.is_home) === 1 || slug === 'index' || slug === 'home' || !slug) ? '../' : `../${encodeURIComponent(slug)}/`;
}
