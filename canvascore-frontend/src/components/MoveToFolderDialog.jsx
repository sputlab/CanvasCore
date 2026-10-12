// "Move to folder…" for one or more images: pick a folder, or type a new one (created on move).
import React, { useEffect, useRef, useState } from 'react';
import { MoveRight } from 'lucide-react';

export default function MoveToFolderDialog({ count, folders, initial = '', onMove, onClose }) {
  const [choice, setChoice] = useState(initial);
  const [fresh, setFresh] = useState('');
  const selectRef = useRef(null);
  useEffect(() => { if (selectRef.current) selectRef.current.focus(); }, []);
  const NEW = '\u0000new';
  const target = choice === NEW ? fresh.trim() : choice;
  const submit = (e) => { e.preventDefault(); if (choice === NEW && !target) return; onMove(target); };
  return (
    <div className="ui-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-move-title" onSubmit={submit}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
        <div className="ui-dialog__head">
          <span className="ui-dialog__icon" aria-hidden="true"><MoveRight size={18} /></span>
          <h2 id="cc-move-title" className="ui-dialog__title">Move {count === 1 ? 'the image' : `${count} images`} to…</h2>
        </div>
        <p className="ui-dialog__msg">Their addresses don't change, so pages that use them keep working.</p>
        <label className="ui-dialog__field">
          <span className="ui-label">Folder</span>
          <select ref={selectRef} className="ui-select" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Not in a folder</option>
            {folders.map((f) => <option key={f} value={f}>{f.split('/').map((s, i, a) => (i < a.length - 1 ? ' ' : '') ).join('') + f.split('/').pop()}{f.includes('/') ? `  (${f})` : ''}</option>)}
            <option value={NEW}>+ New folder…</option>
          </select>
        </label>
        {choice === NEW && (
          <label className="ui-dialog__field">
            <span className="ui-label">New folder name (use / for a folder inside another)</span>
            <input className="ui-input" autoFocus value={fresh} onChange={(e) => setFresh(e.target.value)} placeholder="e.g. Products/Shoes" />
          </label>
        )}
        <div className="ui-dialog__actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="ui-btn ui-btn--primary" disabled={choice === NEW && !target}>Move</button>
        </div>
      </form>
    </div>
  );
}
