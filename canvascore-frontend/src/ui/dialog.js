// In-app dialogs instead of the browser's confirm()/prompt(): same look as the admin, keyboard friendly,
// and they don't freeze the page. Shown by <DialogHost /> (dialogHost.jsx, mounted with the Toaster).
//
//   if (!(await confirmDialog({ title: 'Delete page?', message: '…', confirmLabel: 'Delete', danger: true }))) return;
//   const name = await promptDialog({ title: 'Save as template', label: 'Template name' });   // null = cancelled
//
// Without a mounted host (e.g. an isolated test) they fall back to the browser's dialogs.

let host = null;      // (request) => void, set by the mounted DialogHost
let seq = 0;

export function setDialogHost(fn) {
  host = fn;
  return () => { if (host === fn) host = null; };
}

function open(kind, opts) {
  return new Promise((resolve) => {
    const req = { id: ++seq, kind, ...opts, resolve };
    if (host) { host(req); return; }
    // Fallback: native dialogs
    const text = [opts.title, opts.message].filter(Boolean).join('\n\n');
    if (kind === 'confirm') resolve(typeof window !== 'undefined' && typeof window.confirm === 'function' ? !!window.confirm(text) : false);
    else resolve(typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt(text || opts.label || '', opts.defaultValue || '') : null);
  });
}

// Resolves true (confirmed) or false (cancelled, Esc, click outside).
// opts: { title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false }
export function confirmDialog(opts = {}) {
  return open('confirm', opts);
}

// Resolves the typed text (trimmed) or null when cancelled.
// opts: { title, message, label, defaultValue, placeholder, confirmLabel = 'OK', required = true, readOnly = false }
export function promptDialog(opts = {}) {
  return open('prompt', opts);
}
