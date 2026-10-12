// Upload progress: useUploader() (editor/useUploader.js) uploads the files; <UploadPanel> shows each
// file with its progress bar and result, and stays until closed (so you always know what happened).
import React from 'react';
import { CheckCircle2, AlertTriangle, Upload, X } from 'lucide-react';
import { formatBytes } from '../editor/mediaInfo';

export function UploadPanel({ uploader }) {
  const { queue, clear, busy } = uploader;
  if (!queue.length) return null;
  const done = queue.filter((x) => x.status === 'done').length;
  const failed = queue.filter((x) => x.status === 'error').length;
  const total = queue.length;
  const title = busy ? `Uploading ${Math.min(done + failed + 1, total)} of ${total}…` : `${done} uploaded${failed ? `, ${failed} failed` : ''}`;
  return (
    <div className="cc-upload-panel" role="status" aria-live="polite" aria-label="Upload progress">
      <div className="cc-upload-panel__head">
        <Upload size={15} aria-hidden="true" /> <strong style={{ flex: 1 }}>{title}</strong>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label={busy ? 'Uploads continue in the background' : 'Close'} title={busy ? 'Uploading… (it keeps going if you close)' : 'Close'} onClick={clear} disabled={busy}><X size={15} /></button>
      </div>
      <ul className="cc-upload-panel__list">
        {queue.map((x) => (
          <li key={x.id}>
            <span className="cc-upload-panel__name" title={x.name}>{x.name}</span>
            <span className="cc-upload-panel__size">{formatBytes(x.size)}</span>
            {x.status === 'done' ? <CheckCircle2 size={15} color="#34d399" aria-label="Uploaded" />
              : x.status === 'error' ? <AlertTriangle size={15} color="#f87171" aria-label="Failed" /> : <span className="cc-upload-panel__pct">{x.status === 'waiting' ? 'waiting' : `${Math.round(x.progress * 100)}%`}</span>}
            <span className="cc-upload-panel__bar" aria-hidden="true"><span style={{ width: `${Math.round((x.status === 'done' ? 1 : x.progress) * 100)}%`, background: x.status === 'error' ? '#f87171' : undefined }} /></span>
            {x.status === 'error' && <span className="cc-upload-panel__err">{x.message}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
