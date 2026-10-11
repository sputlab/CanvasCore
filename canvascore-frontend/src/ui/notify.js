// notify(message, 'success' | 'error' | 'info'): a non-blocking notification, shown by <Toaster /> (toast.jsx).
let listeners = [];
let seq = 0;

export function notify(message, tone = 'success') {
  const toast = { id: ++seq, message: String(message), tone };
  listeners.forEach((l) => l(toast));
  return toast.id;
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}
