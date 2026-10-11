// Where a dragged layer lands, from the pointer height over the target row (0 = top edge, 1 = bottom).
// Containers: top quarter = before, bottom quarter = after, middle = inside. Other blocks: halves.
export function dropPosition(ratio, isContainer) {
  if (isContainer) return ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside';
  return ratio < 0.5 ? 'before' : 'after';
}

// True when `id` is `node` itself or one of its descendants (a block can't go inside itself).
export function containsId(node, id) {
  if (!node) return false;
  if (node.id === id) return true;
  return (node.children || []).some((c) => containsId(c, id));
}

export function findBlock(list, id) {
  for (const b of list || []) {
    if (b.id === id) return b;
    const r = findBlock(b.children, id);
    if (r) return r;
  }
  return null;
}
