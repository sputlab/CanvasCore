import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Trash2, Upload, Copy, Zap } from 'lucide-react';
import { Button, IconButton, PageHeader, EmptyState, SearchInput, Badge } from '../ui/kit';
import { formatBytes } from '../editor/mediaInfo';
import { notify } from '../ui/notify';
import { confirmDialog, promptDialog } from '../ui/dialog';

// Media library: upload (button or drag & drop, several files at once), search, alt text, size info,
// optimized copies for faster pages, copy the address, delete.
export default function MediaManager() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [optimizing, setOptimizing] = useState(null); // null | { done, remaining }
  const fileRef = useRef(null);

  const fetchMedia = () => {
    fetch('api.php?action=get_media')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setImages(data); })
      .catch(console.error);
  };

  useEffect(() => { fetchMedia(); }, []);

  const upload = async (files) => {
    const list = [...(files || [])].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of list) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('api.php?action=upload_media', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) ok++; else notify(`${file.name}: ${data.message || 'upload error'}`, 'error');
      } catch { notify(`${file.name}: network error`, 'error'); }
    }
    setUploading(false);
    if (ok) notify(ok === 1 ? 'Image uploaded.' : `${ok} images uploaded.`);
    fetchMedia();
  };

  const handleDelete = async (filename) => {
    if (!(await confirmDialog({ title: `Delete "${filename}"?`, message: 'Pages that use it will show a broken image. This cannot be undone.', confirmLabel: 'Delete image', danger: true }))) return;
    try {
      await fetch('api.php?action=delete_media', { method: 'POST', body: JSON.stringify({ name: filename }) });
      notify('Image deleted.');
      fetchMedia();
    } catch { notify('Error deleting image.', 'error'); }
  };

  // Alt text: saved when the field loses focus; offered automatically when the image is picked for a block
  const saveAlt = async (img, alt) => {
    if ((img.alt || '') === alt) return;
    setImages((list) => list.map((x) => (x.name === img.name ? { ...x, alt } : x)));
    try {
      const data = await (await fetch('api.php?action=save_media_meta', { method: 'POST', body: JSON.stringify({ name: img.name, alt }) })).json();
      if (!data.success) notify(data.message || 'The description was not saved.', 'error');
    } catch { notify('The description was not saved (connection problem).', 'error'); }
  };

  // Optimized copies for images uploaded before this feature (a batch per request)
  const optimizeAll = async () => {
    let done = 0;
    setOptimizing({ done: 0, remaining: images.filter((x) => !x.optimized).length });
    try {
      for (let i = 0; i < 200; i++) {
        const data = await (await fetch('api.php?action=optimize_media', { method: 'POST', body: '{}' })).json();
        if (!data.success) { notify(data.message || 'Optimization stopped.', 'error'); break; }
        done += data.done;
        setOptimizing({ done, remaining: data.remaining });
        if (!data.remaining || !data.done) break;
      }
      notify(done ? `${done} image${done === 1 ? '' : 's'} optimized.` : 'Nothing to optimize.');
    } catch { notify('Optimization stopped (connection problem).', 'error'); }
    setOptimizing(null);
    fetchMedia();
  };
  const notOptimized = images.filter((x) => !x.optimized).length;

  const copyUrl = async (url) => {
    try { await navigator.clipboard.writeText(url); notify('Address copied.'); } catch { await promptDialog({ title: 'Copy the image address', message: 'Copying is blocked here: select the address and copy it (Ctrl/Cmd+C).', defaultValue: url, readOnly: true, confirmLabel: 'Done', hideCancel: true }); }
  };

  const shown = images.filter((img) => !query || `${img.name} ${img.alt || ''}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}>
      <PageHeader icon={ImageIcon} title="Media Library" description="Images you can use in any page. Drop files anywhere on this page to upload them."
        actions={<>
          <Button variant="success" icon={Upload} onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload Images'}</Button>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        </>} />

      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', maxWidth: 360 }}><SearchInput value={query} onChange={setQuery} placeholder="Search by file name…" label="Search images" /></div>
          <span className="ui-hint">{shown.length} of {images.length} images</span>
          {notOptimized > 0 && (
            <Button size="sm" icon={Zap} onClick={optimizeAll} disabled={!!optimizing} title="Make smaller copies so pages load faster on phones">
              {optimizing ? `Optimizing… ${optimizing.done} done, ${optimizing.remaining} left` : `Optimize ${notOptimized} older image${notOptimized === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      )}

      <div className="ui-card" style={{ minHeight: 320, outline: dragging ? '2px dashed #38bdf8' : 'none', outlineOffset: 4 }}>
        {images.length === 0 ? (
          <EmptyState icon={ImageIcon} title="The library is empty" action={<Button variant="success" icon={Upload} onClick={() => fileRef.current && fileRef.current.click()}>Upload your first image</Button>}>
            Upload images here or drop them onto this page.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState icon={ImageIcon} title="No images match your search" />
        ) : (
          <div className="ui-grid" style={{ '--ui-min': '200px', gap: 14 }}>
            {shown.map((img) => (
              <figure key={img.name} style={{ margin: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: 10, overflow: 'hidden' }}>
                <img src={img.url} alt="" loading="lazy" style={{ display: 'block', width: '100%', height: 140, objectFit: 'cover', background: '#1e293b' }} />
                <figcaption style={{ padding: '6px 6px 8px 10px', display: 'grid', gap: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span title={img.name} style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span>
                    <IconButton icon={Copy} label={`Copy the address of ${img.name}`} size="sm" onClick={() => copyUrl(img.url)} />
                    <IconButton icon={Trash2} label={`Delete ${img.name}`} size="sm" onClick={() => handleDelete(img.name)} style={{ color: '#f87171' }} />
                  </span>
                  <span className="ui-row" style={{ gap: 6, fontSize: 11.5, color: '#64748b' }}>
                    {img.w ? <span>{img.w}×{img.h}</span> : null}
                    {img.bytes ? <span>{formatBytes(img.bytes)}</span> : null}
                    {img.variants && img.variants.length ? <Badge tone="published" title="Smaller copies are served to phones and small screens">Optimized</Badge> : null}
                  </span>
                  <input className="ui-input" aria-label={`Description of ${img.name}`} placeholder="Description (alt text)" defaultValue={img.alt || ''}
                    style={{ fontSize: 12, padding: '5px 8px' }} onBlur={(e) => saveAlt(img, e.target.value.trim())}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
