// Phone and tablet previews in the editor: the blocks' responsive CSS is written for the browser window
// ("@media (max-width: 768px)"), but the canvas is a narrow box inside a wide window, so those rules never apply
// there. In those previews the width conditions become container queries on the canvas (.cc-canvas has
// container-name: cc-canvas), so columns stack and sizes change exactly as on a phone or a tablet.
// Other media features (hover, reduced motion) are left as they are.
const WIDTH_MEDIA = /@media\s*\(\s*(max|min)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)/gi;

export function toContainerQueries(html) {
  return String(html).replace(WIDTH_MEDIA, (_, kind, px) => `@container cc-canvas (${kind.toLowerCase()}-width: ${px}px)`);
}

export function forViewport(html, viewport) {
  return viewport && viewport !== 'desktop' ? toContainerQueries(html) : html;
}
