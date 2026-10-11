// Plays a block's entrance animation (and looping motion) once in the editor canvas.
// The element is the block's rendered root (id = custom CSS id or block id); the classes are
// removed again after a few seconds, so the canvas goes back to still.
export function previewEffects(block) {
  if (!block || typeof document === 'undefined') return false;
  const id = String(block.content?.customId || block.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const el = id && document.querySelector(`.cc-canvas #${CSS.escape ? CSS.escape(id) : id}`);
  if (!el) return false;
  el.classList.remove('is-visible', 'cc-fx-preview');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('is-visible', 'cc-fx-preview');
  clearTimeout(el._ccFxTimer);
  el._ccFxTimer = setTimeout(() => el.classList.remove('is-visible', 'cc-fx-preview'), 6000);
  return true;
}
