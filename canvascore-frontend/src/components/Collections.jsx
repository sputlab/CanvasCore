import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Library, Plus, Trash2, Edit3, FileText, Folder, Archive, ArchiveRestore, Globe } from 'lucide-react';
import { Button, IconButton, PageHeader, EmptyState, Badge, StatusBadge } from '../ui/kit';
import { notify } from '../ui/notify';

export default function Collections() {
  const { setView, userRole, setActivePage, setBlocks, setSelectedBlockId, publishSiteAsync } = useStore();
  const [collections, setCollections] = useState([]);
  const [active, setActive] = useState(null); // selected collection
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
    // open the block editor on the item's content
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
      if (res && res.success) { setNeedsPublish(false); notify(res.message || 'Site published.'); } else notify((res && res.message) || 'Publish error', 'error');
    } catch { notify('Publish error', 'error'); }
    setPublishing(false);
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await fetch('api.php?action=delete_item', { method: 'POST', body: JSON.stringify({ id: item.id }) });
    loadItems(active.id);
  };

  return (
    <>
      <PageHeader icon={Library} title="Collections" description="Groups of similar pages, such as a blog, news or a portfolio. Show them on any page with the Collection List block."
        actions={userRole === 'admin' && <Button variant="primary" icon={Plus} onClick={newCollection}>New collection</Button>} />

      {needsPublish && (
        <div role="status" className="ui-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', marginBottom: 14, borderColor: '#38bdf8', fontSize: 13 }}>
          <span>Archive change saved. Public lists update when you publish the site.</span>
          <Button variant="success" size="sm" icon={Globe} onClick={publishNow} disabled={publishing}>{publishing ? 'Publishing…' : 'Publish now'}</Button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 250px) 1fr', gap: 16, alignItems: 'start' }} className="cc-collections-grid">
        <style>{'@media (max-width: 760px) { .cc-collections-grid { grid-template-columns: 1fr !important; } }'}</style>
        <nav className="ui-card" style={{ padding: 10, margin: 0 }} aria-label="Collections">
          {collections.length === 0 ? (
            <p className="ui-hint" style={{ padding: 6 }}>No collections yet.</p>
          ) : collections.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <button type="button" className="ui-nav__item" aria-current={active?.id === c.id ? 'page' : undefined} onClick={() => setActive(c)} style={{ flex: 1, margin: 0 }}>
                <Folder size={15} aria-hidden="true" />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <Badge>{c.item_count}</Badge>
              </button>
              {userRole === 'admin' && <IconButton icon={Trash2} label={`Delete collection ${c.name}`} size="sm" onClick={() => removeCollection(c)} style={{ color: '#f87171' }} />}
            </div>
          ))}
        </nav>

        <section className="ui-card" style={{ margin: 0, minHeight: 260 }} aria-label={active ? `Items of ${active.name}` : 'Items'}>
          {!active ? (
            <EmptyState icon={Library} title="Choose a collection">Select a collection{userRole === 'admin' ? ' or create one' : ''} to manage its items.</EmptyState>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <h2 className="ui-card__title" style={{ margin: 0 }}>{active.name} <span style={{ color: '#64748b', fontSize: 12, fontWeight: 400 }}>/{active.slug}/</span></h2>
                <Button variant="primary" size="sm" icon={Plus} onClick={() => editItem(null)}>New Item</Button>
              </div>
              {items.length === 0 ? (
                <EmptyState icon={FileText} title="No items yet" action={<Button variant="primary" icon={Plus} onClick={() => editItem(null)}>Create the first item</Button>} />
              ) : (
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead><tr><th>Title</th><th>Date</th><th>Status</th><th className="ui-cell-actions">Actions</th></tr></thead>
                    <tbody>
                      {items.map(it => (
                        <tr key={it.id} onDoubleClick={() => editItem(it)}>
                          <td><div className="ui-cell-title">{it.title}</div><div className="ui-cell-muted">/{it.slug}/</div></td>
                          <td className="ui-cell-muted">{it.date || '—'}</td>
                          <td><span className="ui-row" style={{ gap: 6 }}><StatusBadge status={it.status} />{Number(it.archived) ? <Badge>Archived</Badge> : null}</span></td>
                          <td className="ui-cell-actions">
                            <span className="ui-row" style={{ justifyContent: 'flex-end', gap: 4, flexWrap: 'nowrap' }}>
                              <IconButton icon={Number(it.archived) ? ArchiveRestore : Archive} label={Number(it.archived) ? 'Unarchive' : 'Archive'} size="sm" onClick={() => toggleArchive(it)} />
                              <Button variant="primary" size="sm" icon={Edit3} onClick={() => editItem(it)}>Edit</Button>
                              <IconButton icon={Trash2} label={`Delete ${it.title}`} size="sm" onClick={() => removeItem(it)} style={{ color: '#f87171' }} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
