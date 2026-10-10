import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, Image as ImageIcon, LayoutGrid, Trash2, Upload } from 'lucide-react';

export default function MediaManager() {
  const { setView } = useStore();
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = () => {
    fetch('api.php?action=get_media')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setImages(data); })
      .catch(console.error);
  };

  useEffect(() => { fetchMedia(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('api.php?action=upload_media', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) alert(data.message || "Upload Error");
      fetchMedia();
    } catch(err) { alert("Network Error"); }
    setUploading(false);
  };

  const handleDelete = async (filename) => {
    if (!window.confirm("Are you sure you want to delete this image? It cannot be recovered.")) return;
    try {
      await fetch('api.php?action=delete_media', { method: 'POST', body: JSON.stringify({ name: filename }) });
      fetchMedia();
    } catch (e) { alert("Error deleting image."); }
  };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <button onClick={() => setView('manager')} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0, marginBottom: '10px' }}><ChevronLeft size={16} /> Back to Dashboard</button>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><ImageIcon size={24} color="#38bdf8" /> Media Library</h2>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: uploading ? 'wait' : 'pointer' }}>
          <Upload size={18} /> {uploading ? 'Uploading...' : 'Upload Image'}
          <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '30px', minHeight: '400px' }}>
        {images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>The library is empty. Upload your first image.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', position: 'relative', group: 'true' }}>
                <div style={{ height: '150px', backgroundImage: `url(${img.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</div>
                <button onClick={() => handleDelete(img.name)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px', cursor: 'pointer' }} title="Delete"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
