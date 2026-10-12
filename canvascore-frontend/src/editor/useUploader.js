// Uploads files one after the other (into a media folder) and keeps a queue with each file's progress
// and result, shown by <UploadPanel> (components/UploadPanel.jsx).
import { useCallback, useRef, useState } from 'react';
import { uploadImage } from './upload';

export function useUploader(onFinished) {
  const [queue, setQueue] = useState([]);   // [{ id, name, size, status: waiting|uploading|done|error, progress, message }]
  const running = useRef(false);
  const pending = useRef([]);
  const seq = useRef(0);
  const patch = (id, p) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const start = useCallback(async (files, folder = '') => {
    const list = [...(files || [])];
    if (!list.length) return;
    const items = list.map((file) => ({ id: ++seq.current, file, name: file.name, size: file.size, folder,
      status: file.type && !file.type.startsWith('image/') ? 'error' : 'waiting', progress: 0,
      message: file.type && !file.type.startsWith('image/') ? 'Not an image' : '' }));
    setQueue((q) => [...q.filter((x) => x.status === 'waiting' || x.status === 'uploading'), ...items]);
    if (running.current) { pending.current.push(...items.filter((i) => i.status === 'waiting')); return; }
    running.current = true;
    pending.current = items.filter((i) => i.status === 'waiting');
    let ok = 0;
    while (pending.current.length) {
      const it = pending.current.shift();
      patch(it.id, { status: 'uploading' });
      try {
        const data = await uploadImage(it.file, { folder: it.folder, onProgress: (p) => patch(it.id, { progress: p }) });
        if (data && data.success) { ok++; patch(it.id, { status: 'done', progress: 1 }); }
        else patch(it.id, { status: 'error', message: (data && data.message) || 'Upload error' });
      } catch { patch(it.id, { status: 'error', message: 'Connection problem' }); }
    }
    running.current = false;
    if (onFinished) onFinished(ok);
  }, [onFinished]);
  const clear = () => setQueue((q) => q.filter((x) => x.status === 'waiting' || x.status === 'uploading'));
  return { queue, start, clear, busy: queue.some((x) => x.status === 'waiting' || x.status === 'uploading') };
}
