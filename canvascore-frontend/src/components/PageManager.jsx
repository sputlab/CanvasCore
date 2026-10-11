import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { FileText, Plus, Trash2, Edit, ListTree, LogOut, Globe, Image as ImageIcon, Palette, Users, Clock, User, CheckCircle, Edit3, AlertCircle, LayoutTemplate, Download, Upload, ExternalLink, Inbox, Library } from 'lucide-react';

export default function PageManager() {
  const { setView, setActivePage, setBlocks, pages, setPages, logout, userRole, username, publishSiteAsync, setSelectedBlockId, appVersion, appBuild, serverVersion } = useStore();
  const [loading, setLoading] = useState(true);

  const loadPages = useCallback(() => {
    fetch('api.php?action=get_pages')
      .then(res => { if (!res.ok) throw new Error("Unauthorized"); return res.json(); })
      .then(data => { if (Array.isArray(data)) setPages(data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [setPages]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const createPage = async () => {
    const id = 'page-' + Date.now();
    const newPage = {
      id, title: 'New Page', slug: 'new-page', clean_slug: 'new-page',
      layout: 'boxed', boxed_width: '1200px', bg_color: '#ffffff',
      seo_title: '', seo_description: '', content_json: '[]',
      status: 'draft', is_draft_copy: 0, parent_id: null, is_home: 0
    };
    // Persistiamo subito: cosi' la pagina e' un record reale e il pannello di destra
    // si comporta esattamente come quando la si riapre dalla dashboard.
    try {
      await fetch('api.php?action=save_page', { method: 'POST', body: JSON.stringify({ ...newPage, blocks: [], publish: false }) });
    } catch { /* in caso di errore sara' il primo Save Draft a crearla */ }
    setPages([newPage, ...pages]);
    setActivePage(newPage);
    setBlocks([]);
    setSelectedBlockId(null);
    setView('editor');
  };

  const exportSite = async () => {
    try {
      const res = await fetch('api.php?action=export_site');
      if (!res.ok) { alert('Export not allowed (admin only).'); return; }
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `canvascore-site-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { alert('Export failed.'); }
  };

  const importSite = async (file) => {
    if (!file) return;
    if (!window.confirm('Import will REPLACE all current pages, menu, settings, masters and templates (user accounts are kept). Continue?')) return;
    try {
      const text = await file.text();
      const res = await fetch('api.php?action=import_site', { method: 'POST', body: text });
      const data = await res.json();
      alert(data.message || (data.success ? 'Imported.' : 'Import failed.'));
      if (data.success) { loadPages(); await publishSiteAsync(); }
    } catch { alert('Import failed: invalid file.'); }
  };

  const pageUrl = (page) => {
    const slug = page.clean_slug || 'index';
    if (Number(page.is_home) || slug === 'index' || slug === 'home') return '../index.html';
    return `../${encodeURIComponent(slug)}/index.html`;
  };

  const editPage = (page) => {
    let targetPage = page;
    // Se la pagina è stata modificata e ha una copia draft nascosta, apriamo la copia!
    if (page.status === 'modified' && page.draft_copy) {
      targetPage = page.draft_copy;
    }
    setActivePage(targetPage);
    try { setBlocks(JSON.parse(targetPage.content_json || '[]')); } catch { setBlocks([]); }
    setSelectedBlockId(null);
    setView('editor');
  };

  const deletePage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this page? This will also delete the published HTML.')) return;
    try {
      await fetch('api.php?action=delete_page', { method: 'POST', body: JSON.stringify({ id }) });
      setPages(pages.filter(p => p.id !== id));
    } catch { alert("Error deleting page"); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not Saved Yet';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const navBtn = { display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '7px', cursor: 'pointer', fontSize: '12.5px', whiteSpace: 'nowrap' };
  const primaryBtn = { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };
  const publishBtn = { ...primaryBtn, background: '#10b981' };
  const doPublish = async () => {
    const res = await publishSiteAsync();
    if (res && res.success) alert(res.message); else alert(res?.message || 'Publish Error');
    loadPages();
  };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {username && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0f172a', border: '1px solid #334155', borderRadius: '999px', padding: '4px 11px', fontSize: '12px', color: '#cbd5e1' }}>
              <User size={13} color={userRole === 'admin' ? '#38bdf8' : '#a78bfa'} />
              <strong style={{ color: '#f8fafc' }}>{username}</strong>
              <span style={{ color: userRole === 'admin' ? '#38bdf8' : '#a78bfa', textTransform: 'uppercase', fontWeight: 700, fontSize: '9px', letterSpacing: '0.5px' }}>{userRole}</span>
            </div>
          )}
          <button onClick={logout} title="Logout" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', background: '#1a1013', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '999px', cursor: 'pointer', fontSize: '12px' }}><LogOut size={13} /> Logout</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={createPage} style={primaryBtn}><Plus size={15} /> New Page</button>
          <button onClick={doPublish} style={publishBtn}><Globe size={15} /> Publish All</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Pages</h2>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('templates')} style={navBtn}><LayoutTemplate size={15} /> Templates</button>
          <button onClick={() => setView('collections')} style={navBtn}><Library size={15} /> Collections</button>
          <button onClick={() => setView('media')} style={navBtn}><ImageIcon size={15} /> Media</button>
          <button onClick={() => setView('menu')} style={navBtn}><ListTree size={15} /> Menu</button>
          <button onClick={() => setView('settings')} style={navBtn}><Palette size={15} /> Global Options</button>
          {userRole === 'admin' && <button onClick={() => setView('submissions')} style={navBtn}><Inbox size={15} /> Submissions</button>}
          {userRole === 'admin' && <button onClick={() => setView('users')} style={navBtn}><Users size={15} /> Accounts</button>}
          {userRole === 'admin' && <button onClick={exportSite} title="Export whole site as a backup file" style={navBtn}><Upload size={15} /> Export</button>}
          {userRole === 'admin' && <label title="Import a site backup (replaces current content)" style={navBtn}><Download size={15} /> Import<input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={e => { importSite(e.target.files[0]); e.target.value = ''; }} /></label>}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Loading...</div>
      ) : pages.length === 0 ? (
        <div style={{ background: '#1e293b', border: '2px dashed #334155', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <FileText size={48} color="#475569" style={{ marginBottom: '15px' }} />
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>No pages found</h3>
          <button onClick={createPage} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Create Page</button>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 130px', gap: '12px', padding: '11px 16px', background: '#0f172a', borderRadius: '8px 8px 0 0', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #334155' }}>
            <div>PAGE TITLE</div>
            <div>URL (SLUG)</div>
            <div>LAST UPDATE</div>
            <div>STATUS</div>
            <div>AUTHOR</div>
            <div style={{ textAlign: 'right' }}>ACTIONS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', background: '#1e293b', borderRadius: '0 0 8px 8px', overflow: 'hidden', border: '1px solid #334155', borderTop: 'none' }}>
            <style>{`.cc-page-row{transition:background .15s} .cc-page-row:hover{background:#243149}`}</style>
            {pages.map((page, i) => (
              <div key={page.id} className="cc-page-row" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 130px', gap: '12px', padding: '11px 16px', alignItems: 'center', borderBottom: i < pages.length - 1 ? '1px solid #334155' : 'none' }}>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {page.title}
                </div>
                <div style={{ fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Globe size={14} /> /{page.clean_slug || 'index'}{Number(page.is_home) ? <span title="Homepage" style={{ marginLeft: '6px' }}>⭐</span> : null}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} /> {formatDate(page.updated_at)}
                </div>
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                  {page.status === 'published' && (
                    <span style={{ background: '#059669', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Published</span>
                  )}
                  {page.status === 'modified' && (
                    <span style={{ background: '#3b82f6', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> Modified</span>
                  )}
                  {(page.status === 'draft_new' || page.status === 'draft') && (
                    <span style={{ background: '#d97706', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Edit3 size={12} /> Draft</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> {page.author || 'admin'}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <a href={pageUrl(page)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'transparent', color: '#38bdf8', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', textDecoration: 'none' }} title="View page in a new tab"><ExternalLink size={16} /></a>
                  <button onClick={() => editPage(page)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Edit Page"><Edit size={16} /></button>
                  <button onClick={() => deletePage(page.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer' }} title="Delete Page"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '26px', textAlign: 'center', color: '#64748b', fontSize: '12px', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
        <strong>CanvasCore</strong> &middot; v{(serverVersion && serverVersion.app) || appVersion || '0.0.0'}{(serverVersion && serverVersion.build) || appBuild ? ` \u00b7 build ${(serverVersion && serverVersion.build) || appBuild}` : ''}<br/>
        &copy; {new Date().getFullYear()}
        {serverVersion && appVersion && serverVersion.app !== appVersion && (
          <div style={{ color: '#f59e0b', marginTop: '6px' }}>
            Interfaccia v{appVersion} / server v{serverVersion.app}: ricarica dopo l'aggiornamento.
          </div>
        )}
      </div>

    </div>
  );
}
