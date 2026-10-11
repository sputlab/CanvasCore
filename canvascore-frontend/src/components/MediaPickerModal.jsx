import React, { useState, useEffect } from 'react';
import { notify } from '../ui/notify';
import { Image as ImageIcon, X, Upload } from 'lucide-react';

// Media library picker (modal): choose an uploaded image or upload a new one.
// Used by the property panel and by the rich text editor.
const MediaPickerModal = ({ onClose, onSelect }) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fetchMedia = () => { fetch('api.php?action=get_media').then(res => res.json()).then(data => { if (Array.isArray(data)) setImages(data); }).catch(console.error); };
  useEffect(() => { fetchMedia(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch('api.php?action=upload_media', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) notify(data.message || 'Upload error', 'error');
      fetchMedia();
    } catch { notify('Upload failed (connection problem).', 'error'); }
    setUploading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', width: '800px', maxWidth: '90%', height: '600px', maxHeight: '90%', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}><ImageIcon size={20} color="#3b82f6" /> Choose Image</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#10b981', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              <Upload size={16}/> {uploading ? 'Uploading...' : 'Upload File'}
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24}/></button>
          </div>
        </div>
        <div style={{ padding: '14px', flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {images.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>No images found.</div>
          ) : (
            images.map((img, idx) => (
              <div key={idx} onClick={() => onSelect(img.url)} style={{ height: '150px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundImage: `url(${img.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaPickerModal;
