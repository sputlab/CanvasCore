import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, Library, Plus, Trash2, Edit3, FileText, Folder, Archive, ArchiveRestore } from 'lucide-react';

export default function Collections() {
  const { setView, userRole, setActivePage, setBlocks, setSelectedBlockId, publishSiteAsync } = useStore();
  const [collections, setCollections] = useState([]);
  const [active, setActive] = useState(null); // collezione selezionata
  const [items, setItems] = useState([]);
  const [needsPublish, setNeedsPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const loadCollections = () => {
    fetch('api.php?action=get_collections').then(r => r.json()).then(d => { if (Array.isArray(d)) setCollections(d); }).catch(console.error);
  };
  const loadItems = (cid) => {
    fetch('api.php?action=get_items&collection=' + encodeURIComponent(cid)).then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d); }).catch(console.error);
  };
  useEffect(() => { loadCollections(); }, []);
  useEffect(() => { if (active) loadItems(active.id); }, [active]);

  const newCollection = async () => {
    const name = window.prompt('New collection name (e.g. Blog, Portfolio):');
    if (!name) return;
    const res = await fetch('api.php?action=save_collection', { method: 'POST', body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.success) loadCollections(); else alert(data.message || 'Error');
  };
  const removeCollection = async (c) => {
    if (!window.confirm(`Delete collection "${c.name}" and ALL its items?`)) return;
    await fetch('api.php?action=delete_collection', { method: 'POST', body: JSON.stringify({ id: c.id }) });
    if (active?.id === c.id) setActive(null);
    loadCollections();
  };

  const editItem = async (item) => {
    let full = { id: item?.id, collection_id: active.id, title: 'New Item', slug: 'new-item', excerpt: '', cover_image: '', date: new Date().toISOString().slice(0, 10), status: 'draft', archived: 0, seo_title: '', seo_description: '', blocks: [] };
    if (item) {
      const res = await fetch('api.php?action=get_item&id=' + encodeURIComponent(item.id));
      const data = await res.json();
      if (data) full = { ...data, blocks: JSON.parse(data.content_json || '[]') };
    }
    // apro l'editor a blocchi sul contenuto della voce
    setActivePage({
      id: full.id || ('item_' + Date.now()),
      __item: true, collection_id: active.id,
      title: full.title, slug: full.slug, excerpt: full.excerpt, cover_image: full.cover_image,
      date: full.date, status: full.status === 'published' ? 'published' : 'draft',
      archived: Number(full.archived) ? 1 : 0,
      seo_title: full.seo_title || '', seo_description: full.seo_description || '',
      layout: 'full', bg_color: '#ffffff', boxed_width: '1100px',
    });
    setBlocks(Array.isArray(full.blocks) ? full.blocks : []);
    setSelectedBlockId(null);
    setView('editor');
  };
  const toggleArchive = async (item) => {
    try {
      const res = await fetch('api.php?action=get_item&id=' + encodeURIComponent(item.id));
      const full = await res.json();
      if (!full) return;
      await fetch('api.php?action=save_item', { method: 'POST', body: JSON.stringify({
        id: full.id, collection_id: full.collection_id, title: full.title, slug: full.slug,
        excerpt: full.excerpt, cover_image: full.cover_image, date: full.date, status: full.status,
        seo_title: full.seo_title, seo_description: full.seo_description,
        archived: Number(full.archived) === 1 ? 0 : 1
      }) });
      loadItems(active.id);
      setNeedsPublish(true);
    } catch { /* noop */ }
  };

  const publishNow = async () => {
    setPublishing(true);
    try {
      const res = await publishSiteAsync();
      if (res && res.success) setNeedsPublish(false); else alert((res && res.message) || 'Publish error');
    } catch { alert('Publish error'); }
    setPublishing(false);
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await fetch('api.php?action=delete_item', { method: 'POST', body: JSON.stringify({ id: item.id }) });
    loadItems(active.id);
  };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc' }}>
      <button onClick={() => setView('manager')} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0, marginBottom: '14px' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
      <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Library size={22} color="#38bdf8" /> Collections <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 400 }}>(blog, portfolio, …)</span>
      </h2>

      {needsPublish && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '12.5px', color: '#cbd5e1' }}>
          <span>Archive change saved. Public lists update when you publish the site.</span>
          <button onClick={publishNow} disabled={publishing} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>{publishing ? 'Publishing…' : 'Publish now'}</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Elenco collezioni */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>COLLECTIONS</span>
            {userRole === 'admin' && <button onClick={newCollection} title="New collection" style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer' }}><Plus size={13} /></button>}
          </div>
          {collections.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#64748b' }}>No collections yet.</p>
          ) : collections.map(c => (
            <div key={c.id} onClick={() => setActive(c)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 9px', borderRadius: '7px', cursor: 'pointer', marginBottom: '4px', background: active?.id === c.id ? '#0f172a' : 'transparent', border: active?.id === c.id ? '1px solid #38bdf8' : '1px solid transparent' }}>
              <Folder size={14} color="#38bdf8" />
              <span style={{ flex: 1, fontSize: '13px' }}>{c.name}</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{c.item_count}</span>
              {userRole === 'admin' && <button onClick={(e) => { e.stopPropagation(); removeCollection(c); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button>}
            </div>
          ))}
        </div>

        {/* Voci della collezione selezionata */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '14px', minHeight: '260px' }}>
          {!active ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 20px' }}>
              <Library size={36} style={{ marginBottom: '10px' }} />
              <p>Select a collection{userRole === 'admin' ? ' or create one' : ''} to manage its items.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>{active.name} <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 400 }}>/{active.slug}/</span></h3>
                <button onClick={() => editItem(null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}><Plus size={14} /> New Item</button>
              </div>
              {items.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>No items yet. Create the first one.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {items.map(it => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '9px 12px' }}>
                      <FileText size={15} color="#94a3b8" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>/{it.slug}/ {it.date && `· ${it.date}`}</div>
                      </div>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: it.status === 'published' ? '#064e3b' : '#78350f', color: it.status === 'published' ? '#6ee7b7' : '#fcd34d' }}>{it.status}</span>
                      {Number(it.archived) ? <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>archived</span> : null}
                      <button onClick={() => toggleArchive(it)} title={Number(it.archived) ? 'Unarchive' : 'Archive'} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}>{Number(it.archived) ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
                      <button onClick={() => editItem(it)} style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}><Edit3 size={13} /> Edit</button>
                      <button onClick={() => removeItem(it)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
