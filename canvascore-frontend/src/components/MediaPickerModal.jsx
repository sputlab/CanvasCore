import React, { useState, useEffect, useRef } from 'react';
import { notify } from '../ui/notify';
import { Image as ImageIcon, X, Upload } from 'lucide-react';
import { SearchInput } from '../ui/kit';
import { formatBytes } from '../editor/mediaInfo';

// Media library picker (modal): choose an uploaded image or upload new ones.
// Used by the property panel and by the rich text editor. onSelect(url, alt): alt = the image's
// description saved in the library (empty when none), so blocks can fill their alt field.
const MediaPickerModal = ({ onClose, onSelect }) => {
  const [images, setImages] = useState(null);   // null = loading
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const closeRef = useRef(null);
  const fetchMedia = () => fetch('api.php?action=get_media').then((res) => res.json())
    .then((data) => setImages(Array.isArray(data) ? data : []))
    .catch(() => { setImages([]); notify('Could not load the media library.', 'error'); });
  useEffect(() => { fetchMedia(); if (closeRef.current) closeRef.current.focus(); }, []);

  const handleUpload = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const formData = new FormData(); formData.append('file', file);
      try {
        const data = await (await fetch('api.php?action=upload_media', { method: 'POST', body: formData })).json();
        if (!data.success) notify(`${file.name}: ${data.message || 'upload error'}`, 'error');
      } catch { notify(`${file.name}: upload failed (connection problem).`, 'error'); }
    }
    setUploading(false);
    fetchMedia();
  };

  const q = query.trim().toLowerCase();
  const shown = (images || []).filter((img) => !q || `${img.name} ${img.alt || ''}`.toLowerCase().includes(q));

  return (
    <div className="ui-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ui-dialog cc-picker" role="dialog" aria-modal="true" aria-labelledby="cc-picker-title"
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }}>
        <div className="ui-dialog__head" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ui-dialog__icon" aria-hidden="true"><ImageIcon size={18} /></span>
            <h2 id="cc-picker-title" className="ui-dialog__title">Choose an image</h2>
          </span>
          <span className="ui-row" style={{ gap: 8 }}>
            <label className="ui-btn ui-btn--success ui-btn--sm" style={{ cursor: uploading ? 'progress' : 'pointer' }}>
              <Upload size={14} aria-hidden="true" /> {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" multiple style={{ display: 'none' }} accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
            <button ref={closeRef} type="button" className="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" aria-label="Close" onClick={onClose}><X size={16} /></button>
          </span>
        </div>
        {images && images.length > 0 && <div style={{ margin: '6px 0 10px' }}><SearchInput value={query} onChange={setQuery} placeholder="Search by name or description…" label="Search images" /></div>}
        <div className="cc-picker__grid">
          {images === null ? <p className="ui-hint">Loading…</p>
            : images.length === 0 ? <p className="ui-hint">No images yet: upload one.</p>
            : shown.length === 0 ? <p className="ui-hint">No images match your search.</p>
            : shown.map((img) => (
              <button key={img.name} type="button" className="cc-picker__item" onClick={() => onSelect(img.url, img.alt || '')}
                title={img.alt ? `${img.name} — ${img.alt}` : img.name} aria-label={`Choose ${img.alt || img.name}`}>
                <img src={img.url} alt="" loading="lazy" />
                <span className="cc-picker__meta">{img.w ? `${img.w}×${img.h}` : ''}{img.bytes ? ` · ${formatBytes(img.bytes)}` : ''}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MediaPickerModal;
