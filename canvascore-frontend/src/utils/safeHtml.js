// Every piece of HTML the editor puts into its own page (canvas, version history, rich text fields) goes through
// safeHtml() first: scripts, event handlers and javascript: links are removed, so content can never run code in
// the admin, whoever saved it. The server cleans rich text too (on save and on publish); this is the second line.
import createDOMPurify from 'dompurify';

const CONFIG = {
  ADD_TAGS: ['iframe'],                                    // video and map embeds in the canvas
  ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy', 'contenteditable'],   // contenteditable: text edited in place
  FORBID_TAGS: ['script', 'base', 'meta', 'link', 'object', 'embed', 'frame', 'frameset'],
  FORBID_ATTR: ['srcdoc', 'formaction'],
  FORCE_BODY: true,                                        // keeps a leading <style> of a block
};

let purifier = null;
let purifierWin = null;

function getPurifier() {
  // the window that owns the page's document (in the browser that is simply window)
  const win = (typeof document !== 'undefined' && document.defaultView) || (typeof window !== 'undefined' ? window : null);
  if (!win) return null;
  if (!purifier || purifierWin !== win) {
    purifier = createDOMPurify(win);
    purifierWin = win;
    // A link that opens a new tab can't reach back to the editor
    purifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && (node.getAttribute('target') || '').toLowerCase() === '_blank') node.setAttribute('rel', 'noopener noreferrer');
    });
  }
  return purifier;
}

export function safeHtml(html) {
  const p = getPurifier();
  if (!p || !p.isSupported) return '';                     // no DOM to clean with: show nothing rather than raw HTML
  return p.sanitize(String(html ?? ''), CONFIG);
}
