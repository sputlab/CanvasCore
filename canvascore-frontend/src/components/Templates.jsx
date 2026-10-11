import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { uniqueSlug } from '../utils/slug';
import { ChevronLeft, LayoutTemplate, Plus, FileText } from 'lucide-react';

// Regenerates the block tree's ids to avoid collisions
let _seq = 0;
const newPageId = () => 'page-' + Date.now();
const regenIds = (node) => {
  const n = { ...node, id: 'block-' + Date.now() + '-' + (_seq++) };
  if (node.children) n.children = node.children.map(regenIds);
  return n;
};

export default function Templates() {
  const { setView, setActivePage, setBlocks, setSelectedBlockId, pages, setPages } = useStore();
  const [starters, setStarters] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('api.php?action=get_starters')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setStarters(data); })
      .catch(console.error);
  }, []);

  const applyStarter = async (starter) => {
    setBusy(true);
    const id = newPageId();
    const blocks = (starter.blocks || []).map(regenIds);
    // The slug follows the title, as for a new blank page (and skips slugs already in use)
    const title = starter.name === 'Blank' ? 'New Page' : starter.name;
    const slug = uniqueSlug(title, { pages });
    const newPage = {
      id, title, slug, clean_slug: slug,
      layout: 'boxed', boxed_width: '1200px', bg_color: '#ffffff',
      seo_title: '', seo_description: '', content_json: JSON.stringify(blocks),
      status: 'draft', is_draft_copy: 0, parent_id: null, is_home: 0,
    };
    try {
      await fetch('api.php?action=save_page', { method: 'POST', body: JSON.stringify({ ...newPage, blocks, publish: false }) });
    } catch { /* noop */ }
    setPages([newPage, ...pages]);
    setActivePage(newPage);
    setBlocks(blocks);
    setSelectedBlockId(null);
    setBusy(false);
    setView('editor');
  };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc' }}>
      <button onClick={() => setView('manager')} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0, marginBottom: '20px' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
      <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LayoutTemplate size={24} color="#38bdf8" /> Start from a template
      </h2>
      <p style={{ color: '#94a3b8', margin: '0 0 30px 0', fontSize: '14px' }}>Pick a starting point. It creates a new draft page you can fully edit.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {starters.map(st => (
          <div key={st.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              {st.id === 'blank' ? <Plus size={36} /> : <FileText size={36} />}
            </div>
            <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>{st.name}</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#94a3b8', flex: 1 }}>{st.description}</p>
              <button disabled={busy} onClick={() => applyStarter(st)} style={{ padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Use template
              </button>
            </div>
          </div>
        ))}
        {starters.length === 0 && <p style={{ color: '#64748b' }}>No templates available.</p>}
      </div>
    </div>
  );
}
