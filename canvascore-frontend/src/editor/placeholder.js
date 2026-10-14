// Built-in placeholder image (a light grey box with its size), used for new slides, images and logos.
// A PNG data: URI drawn on a canvas, so it needs no outside service and works offline. PNG rather than SVG:
// saving a page blanks every SVG address (an SVG can carry scripts), and PNG is allowed through.
// Without a canvas (very old browsers) there is no placeholder: the image is simply left empty.
const cache = new Map();

export function placeholderImage(w, h, label = `${w} × ${h}`) {
  const key = `${w}x${h}:${label}`;
  if (cache.has(key)) return cache.get(key);
  let uri = '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.max(12, Math.min(Math.floor(h / 6), 36))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2);
      uri = canvas.toDataURL('image/png');
    }
  } catch { /* no canvas: no placeholder */ }
  cache.set(key, uri);
  return uri;
}
