// Built-in placeholder image (a light grey box with its size), used for new slides, images and logos.
// A data: URI, so it needs no outside service and works offline; every character that could end or
// break a URL (# ' " < > %) is percent-encoded.
export function placeholderImage(w, h, label = `${w} × ${h}`) {
  const fs = Math.max(12, Math.min(Math.floor(h / 6), 36));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>`
    + `<rect width='100%' height='100%' fill='#e2e8f0'/>`
    + `<text x='50%' y='50%' fill='#64748b' font-family='system-ui,sans-serif' font-size='${fs}' text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
