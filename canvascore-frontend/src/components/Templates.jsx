import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { uniqueSlug } from '../utils/slug';
import { LayoutTemplate, Plus, FileText } from 'lucide-react';
import { Button, PageHeader, EmptyState } from '../ui/kit';
import { blockLabel, CONTAINER_TYPES } from '../editor/blockCatalog';

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

  // What a starter contains (content blocks, not their containers), as a quick outline
  const outline = (st) => {
    const out = [];
    const walk = (list) => (list || []).forEach((b) => { if (!CONTAINER_TYPES.includes(b.type) && !out.includes(blockLabel(b.type))) out.push(blockLabel(b.type)); walk(b.children); });
    walk(st.blocks);
    return out.slice(0, 7);
  };

  return (
    <>
      <PageHeader icon={LayoutTemplate} title="Start from a template"
        description="Pick a starting point. It creates a new draft page you can fully edit." />
      {starters.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="No templates available" />
      ) : (
        <div className="ui-grid" style={{ '--ui-min': '240px', gap: 16 }}>
          {starters.map(st => (
            <article key={st.id} className="ui-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0 }}>
              <div style={{ height: 96, background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                {st.id === 'blank' ? <Plus size={32} aria-hidden="true" /> : <FileText size={32} aria-hidden="true" />}
              </div>
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 15, color: '#f8fafc' }}>{st.name}</h2>
                <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>{st.description}</p>
                {outline(st).length > 0 && (
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }} title="Sections in this template">{outline(st).join(' · ')}</p>
                )}
                <div style={{ flex: 1 }} />
                <Button variant="primary" block disabled={busy} onClick={() => applyStarter(st)}>Use template</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
