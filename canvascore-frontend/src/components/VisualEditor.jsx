import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import PropertyPanel from './PropertyPanel';
import Canvas from './Canvas';
import LayerNavigator from './LayerNavigator';
import EditorDraftStatus from './EditorDraftStatus';
import { useEditorDraft } from '../session/hooks';
import { clearDraft } from '../session/drafts';
import { editorScope } from '../session/draftTrackers';
import {
  ChevronLeft, ChevronRight, Monitor, Tablet, Smartphone, Undo2, Redo2,
  Save, Globe, LayoutTemplate, PanelLeft, Columns3, MonitorPlay, Mail, Code,
  Star, MessageSquareQuote, Library, Trash2, HelpCircle, Images, MapPin, Layers,
  PlusCircle, Layout, Crown, Grid, X, AlertCircle, LayoutGrid, Type, SquareChartGantt, Image as ImageIcon, Rows3, PanelTop, CreditCard, GalleryHorizontal, SeparatorHorizontal, Info, ListOrdered, Hash, BarChart3, Table2, Timer, History, Building2, Users, GitCompare, Store } from 'lucide-react';

const SidebarAccordion = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '10px' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: 'none', color: '#64748b', fontWeight: '800', fontSize: '11px', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}>
        {title} <span style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: '10px' }}>▶</span>
      </button>
      {isOpen && <div style={{ paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>}
    </div>
  );
};

export default function VisualEditor() {
  const {
    activePage, setView, blocks, addBlock, updateActivePage,
    viewport, setViewport, undo, redo, pastBlocks, futureBlocks,
    templates, fetchTemplates, addSavedBlock, deleteTemplate, publishSiteAsync,
    selectedBlockId, setSelectedBlockId,
    masters, fetchMasters, insertMaster, deleteMaster,
    isEditingMaster, exitMasterEditMode, setPages
  , userRole} = useStore();

  const [isPublishing, setIsPublishing] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftTab, setLeftTab] = useState('add');

  // Local backup of unsaved work + "modified" state (see src/session/)
  const draft = useEditorDraft();
  const editorRestored = useStore((s) => s.editorRestored);

  useEffect(() => {
    fetchTemplates();
    fetchMasters();
    const handleKeyDown = (e) => {
      if (useStore.getState().sessionExpired) return;   // with the login on top, the editor "behind" must not be modified
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; // typing: the field has its own undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, fetchTemplates, fetchMasters]);

  const savePageRaw = async (publish = false) => {
    if (isEditingMaster) return null;
    // Global header/footer: saved to site_parts
    if (activePage.__part) {
      try {
        const res = await fetch('api.php?action=save_part', { method: 'POST', body: JSON.stringify({ name: activePage.__part, blocks }) });
        return await res.json();
      } catch { alert('Error saving part.'); return null; }
    }
    // Collection item: saved to collection_items
    if (activePage.__item) {
      try {
        const res = await fetch('api.php?action=save_item', { method: 'POST', body: JSON.stringify({
          id: activePage.id, collection_id: activePage.collection_id,
          title: activePage.title, slug: activePage.slug, excerpt: activePage.excerpt,
          cover_image: activePage.cover_image, date: activePage.date, archived: activePage.archived ? 1 : 0,
          status: publish ? 'published' : (activePage.status || 'draft'),
          seo_title: activePage.seo_title, seo_description: activePage.seo_description, blocks
        }) });
        const data = await res.json();
        if (data.success && publish) updateActivePage({ status: 'published' });
        return data;
      } catch { alert('Error saving item.'); return null; }
    }
    const payload = {
      id: activePage.id, title: activePage.title, slug: activePage.slug,
      seo_title: activePage.seo_title, seo_description: activePage.seo_description, seo_image: activePage.seo_image,
      layout: activePage.layout, boxed_width: activePage.boxed_width, bg_color: activePage.bg_color, blocks: blocks,
      publish: publish
    };
    try {
      const res = await fetch('api.php?action=save_page', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();

      // If we just created a hidden draft copy (because it was published and we saved as draft)
      if (!publish && data.new_id && data.new_id !== activePage.id) {
         updateActivePage({ id: data.new_id, is_draft_copy: 1, parent_id: activePage.id });
      }
      // If we published a draft copy, the ID goes back to being the parent's
      if (publish && data.new_id) {
         updateActivePage({ id: data.new_id, is_draft_copy: 0, status: 'published' });
      }
      return data;
    } catch { alert("Error saving page."); return null; }
  };

  // After EVERY successful save the current state becomes the "saved" one: the local backup is no longer needed.
  const savePage = async (publish = false) => {
    const data = await savePageRaw(publish);
    if (data && data.success) draft.markSaved();
    return data;
  };

  const publishSite = async () => {
    if (isEditingMaster) return;
    setIsPublishing(true);

    try {
      const saved = await savePage(true);
      if (!saved || !saved.success) {
        alert('Not published: saving the page failed' + (saved && saved.message ? ' (' + saved.message + ')' : '') + '.\nYour changes are still here and backed up on this device.');
        setIsPublishing(false);
        return;
      }
      const res = await publishSiteAsync();
      if (res && res.success) alert(`🎉 Success! ${res.message}`);
      else alert(`Error: ${res?.message || 'Server unreachable'}`);

      // Update the global state to reflect the changes in the dashboard
      fetch('api.php?action=get_pages').then(r => r.json()).then(d => setPages(d));
    } catch {
      alert("Error publishing.");
    }

    setIsPublishing(false);
  };

  const discardChanges = async () => {
    if (!window.confirm("Are you sure you want to discard all draft changes? This will restore the live published version.")) return;
    try {
      await fetch('api.php?action=discard_draft', { method: 'POST', body: JSON.stringify({ id: activePage.parent_id }) });
      fetch('api.php?action=get_pages').then(r => r.json()).then(d => setPages(d));
      draft.discard();
      setView('manager');
    } catch { alert("Error discarding changes."); }
  };

  const getValidParentId = () => {
    if (!selectedBlockId) return null;
    const findNode = (nodes, id) => {
      for (let n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
          const found = findNode(n.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const block = findNode(blocks, selectedBlockId);
    if (block && ['SECTION', 'CONTAINER', 'FLEX_ROW', 'CSS_GRID'].includes(block.type)) return block.id;
    return null;
  };

  const handleAddBlock = (type) => {
    const targetId = getValidParentId();
    addBlock(type, targetId);
  };

  const btnStyle = { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', cursor: 'pointer', background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' };
  const deviceBtnStyle = (active) => ({ padding: '6px 12px', background: active ? '#334155' : 'transparent', color: active ? '#f8fafc' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' });
  const tile = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px 5px', cursor: 'pointer', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '8px', fontSize: '10.5px', fontWeight: '600', textAlign: 'center', lineHeight: 1.1, transition: 'all 0.15s' };
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' };
  const tabBtnStyle = (active) => ({ flex: 1, padding: '8px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', background: active ? '#1e293b' : 'transparent', color: active ? '#38bdf8' : '#64748b', border: 'none', borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' });

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#e2e8f0', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {editorRestored && (
        <div role="status" style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: '#0c4a6e', color: '#e0f2fe', border: '1px solid #0369a1', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', maxWidth: 'calc(100vw - 24px)' }}>
          <span><strong>Restored unsaved changes</strong> from your previous session. They are <strong>not saved to the site yet</strong>: use Save Draft or Publish to keep them.</span>
          <button onClick={() => {
            if (!window.confirm('Discard the restored changes? The page goes back to its last saved version.')) return;
            clearDraft(editorScope(useStore.getState()));
            draft.discard();
            setSelectedBlockId(null); setView('manager');
          }} style={{ background: 'transparent', color: '#bae6fd', border: '1px solid #0369a1', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>Discard</button>
        </div>
      )}

      {isEditingMaster && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '9px 16px', background: '#fbbf24', color: '#78350f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000, fontWeight: '600', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Crown size={18} /> ISOLATE MODE: Editing a Global Master. (Changes will reflect everywhere).
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => exitMasterEditMode(false)} style={{ padding: '6px 15px', background: 'transparent', border: '1px solid #78350f', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            <button onClick={() => exitMasterEditMode(true)} style={{ padding: '6px 15px', background: '#78350f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Master & Close</button>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: isEditingMaster ? '50px' : 0, left: 0, width: '100%', height: isEditingMaster ? 'calc(100% - 50px)' : '100%', overflowY: 'auto', paddingTop: '64px', paddingBottom: '64px' }}>
        <Canvas />
      </div>

      {!isEditingMaster && (
        <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 40, background: '#0f172a', padding: '5px 12px', borderRadius: '50px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={() => setViewport('desktop')} style={deviceBtnStyle(viewport === 'desktop')}><Monitor size={16}/></button>
            <button onClick={() => setViewport('tablet')} style={deviceBtnStyle(viewport === 'tablet')}><Tablet size={16}/></button>
            <button onClick={() => setViewport('mobile')} style={deviceBtnStyle(viewport === 'mobile')}><Smartphone size={16}/></button>
          </div>
          <div style={{ width: '1px', height: '24px', background: '#334155' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '13px', fontWeight: 'bold', padding: '0 10px' }}>
            <Layout size={14}/> {activePage?.title || 'Editing Page'}

            {activePage?.is_draft_copy == 1 ? (
              <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', textTransform: 'uppercase', marginLeft: '5px' }}>Modified (Draft)</span>
            ) : activePage?.status === 'published' ? (
              <span style={{ background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', textTransform: 'uppercase', marginLeft: '5px' }}>Published</span>
            ) : (
              <span style={{ background: '#d97706', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', textTransform: 'uppercase', marginLeft: '5px' }}>Draft</span>
            )}

            {selectedBlockId && (
              <button onClick={() => setSelectedBlockId(null)} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }} title="Deselect Current Block">
                <X size={12}/> Deselect
              </button>
            )}
          </div>

          <div style={{ width: '1px', height: '24px', background: '#334155' }}></div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={undo} disabled={pastBlocks.length === 0} style={{ border: 'none', background: 'transparent', cursor: pastBlocks.length === 0 ? 'default' : 'pointer', color: pastBlocks.length === 0 ? '#475569' : '#f8fafc' }}><Undo2 size={18}/></button>
            <button onClick={redo} disabled={futureBlocks.length === 0} style={{ border: 'none', background: 'transparent', cursor: futureBlocks.length === 0 ? 'default' : 'pointer', color: futureBlocks.length === 0 ? '#475569' : '#f8fafc' }}><Redo2 size={18}/></button>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: isEditingMaster ? '50px' : 0, bottom: 0, left: leftOpen ? 0 : '-250px', width: '250px', background: '#0f172a', zIndex: 50, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 15px rgba(0,0,0,0.1)' }}>
        <button onClick={() => setLeftOpen(!leftOpen)} style={{ position: 'absolute', right: '-32px', top: '20px', width: '32px', height: '40px', background: '#0f172a', border: 'none', borderRadius: '0 8px 8px 0', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
          {leftOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
        </button>

        <div style={{ padding: '11px 16px', borderBottom: '1px solid #1e293b' }}>
          <button onClick={() => {
            if (useStore.getState().editorDirty && !window.confirm('You have unsaved changes.\n\nThey stay backed up on this device and will be offered for restore next time, but they are NOT saved to the site.\n\nLeave the editor anyway?')) return;
            setSelectedBlockId(null); setView('manager');
          }} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0 }}>
            <ChevronLeft size={16} /> Pages Dashboard
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
          <button onClick={() => setLeftTab('add')} style={tabBtnStyle(leftTab === 'add')}><PlusCircle size={14}/> ADD</button>
          <button onClick={() => setLeftTab('nav')} style={tabBtnStyle(leftTab === 'nav')}><Layers size={14}/> NAVIGATOR</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {leftTab === 'nav' ? (
            <LayerNavigator />
          ) : (
            <div style={{ padding: '10px' }}>

              {!isEditingMaster && (
                <SidebarAccordion title="GLOBAL MASTERS" defaultOpen={false}>
                  {masters.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#64748b', padding: '10px', background: '#1e293b', borderRadius: '6px', textAlign: 'center', border: '1px dashed #334155' }}>No Master Components yet.</div>
                  ) : (
                    masters.map(m => (
                      <div key={m.id} style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                        <button onClick={() => insertMaster(m.id, m.name, getValidParentId())} style={{...btnStyle, margin: 0, flex: 1, borderColor: '#fcd34d', background: '#451a03', color: '#fde68a'}}><Crown size={16}/> {m.name}</button>
                        <button onClick={() => deleteMaster(m.id)} style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><Trash2 size={14}/></button>
                      </div>
                    ))
                  )}
                </SidebarAccordion>
              )}

              <SidebarAccordion title="STRUCTURAL (DOM)" defaultOpen={false}>
                <div style={grid2}>
                  <button onClick={() => handleAddBlock('SECTION')} style={tile}><LayoutTemplate size={18} color="#38bdf8" /> Section</button>
                  <button onClick={() => handleAddBlock('CONTAINER')} style={tile}><LayoutGrid size={18} color="#f472b6" /> Container</button>
                  <button onClick={() => handleAddBlock('CSS_GRID')} style={tile}><Grid size={18} color="#a78bfa" /> CSS Grid</button>
                  <button onClick={() => handleAddBlock('FLEX_ROW')} style={tile}><Columns3 size={18} color="#a78bfa" /> Flex Row</button>
                </div>
              </SidebarAccordion>

              {!isEditingMaster && (
                <SidebarAccordion title="MY TEMPLATES (COPIES)" defaultOpen={false}>
                  {templates.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#64748b', padding: '10px', background: '#1e293b', borderRadius: '6px', textAlign: 'center', border: '1px dashed #334155' }}>No templates saved.</div>
                  ) : (
                    templates.map(t => (
                      <div key={t.id} style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                        <button onClick={() => addSavedBlock(t.content_json, getValidParentId())} style={{...btnStyle, margin: 0, flex: 1, borderColor: '#a78bfa', background: '#2e1065', color: '#ddd6fe'}}><Library size={16}/> {t.name}</button>
                        <button onClick={() => deleteTemplate(t.id)} style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><Trash2 size={14}/></button>
                      </div>
                    ))
                  )}
                </SidebarAccordion>
              )}

              <SidebarAccordion title="PREMIUM BLOCKS" defaultOpen={false}>
                <div style={grid2}>
                  <button onClick={() => handleAddBlock('FAQ')} style={tile}><HelpCircle size={18} color="#10b981" /> FAQ</button>
                  <button onClick={() => handleAddBlock('SLIDER')} style={tile}><Images size={18} color="#10b981" /> Slider</button>
                  <button onClick={() => handleAddBlock('MAPS')} style={tile}><MapPin size={18} color="#10b981" /> Maps</button>
                  <button onClick={() => handleAddBlock('COLLECTION_LIST')} style={tile}><Library size={18} color="#10b981" /> Collection List</button>
                  <button onClick={() => handleAddBlock('ACCORDION')} style={tile}><Rows3 size={18} color="#10b981" /> Accordion</button>
                  <button onClick={() => handleAddBlock('TABS')} style={tile}><PanelTop size={18} color="#10b981" /> Tabs</button>
                  <button onClick={() => handleAddBlock('PRICING')} style={tile}><CreditCard size={18} color="#10b981" /> Pricing</button>
                  <button onClick={() => handleAddBlock('GALLERY')} style={tile}><GalleryHorizontal size={18} color="#10b981" /> Gallery</button>
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="CONTENT BLOCKS" defaultOpen={false}>
                <div style={grid2}>
                  <button onClick={() => handleAddBlock('DIVIDER')} style={tile}><SeparatorHorizontal size={18} color="#f59e0b" /> Divider</button>
                  <button onClick={() => handleAddBlock('CALLOUT')} style={tile}><Info size={18} color="#f59e0b" /> Callout</button>
                  <button onClick={() => handleAddBlock('STEPS')} style={tile}><ListOrdered size={18} color="#f59e0b" /> Steps</button>
                  <button onClick={() => handleAddBlock('COUNTERS')} style={tile}><Hash size={18} color="#f59e0b" /> Counters</button>
                  <button onClick={() => handleAddBlock('PROGRESS')} style={tile}><BarChart3 size={18} color="#f59e0b" /> Progress</button>
                  <button onClick={() => handleAddBlock('TABLE')} style={tile}><Table2 size={18} color="#f59e0b" /> Table</button>
                  <button onClick={() => handleAddBlock('COUNTDOWN')} style={tile}><Timer size={18} color="#f59e0b" /> Countdown</button>
                  <button onClick={() => handleAddBlock('TIMELINE')} style={tile}><History size={18} color="#f59e0b" /> Timeline</button>
                  <button onClick={() => handleAddBlock('LOGOS')} style={tile}><Building2 size={18} color="#f59e0b" /> Logo Cloud</button>
                  <button onClick={() => handleAddBlock('TEAM')} style={tile}><Users size={18} color="#f59e0b" /> Team</button>
                  <button onClick={() => handleAddBlock('BEFORE_AFTER')} style={tile}><GitCompare size={18} color="#f59e0b" /> Before/After</button>
                  <button onClick={() => handleAddBlock('BUSINESS')} style={tile}><Store size={18} color="#f59e0b" /> Business Info</button>
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="PRE-MADE SECTIONS" defaultOpen={false}>
                <div style={grid2}>
                  <button onClick={() => handleAddBlock('HERO')} style={tile}><LayoutTemplate size={18} color="#fcd34d" /> Hero</button>
                  <button onClick={() => handleAddBlock('IMAGE_TEXT')} style={tile}><PanelLeft size={18} color="#fdba74" /> Image + Text</button>
                  <button onClick={() => handleAddBlock('CARDS')} style={tile}><Columns3 size={18} color="#86efac" /> Cards</button>
                  <button onClick={() => handleAddBlock('VIDEO')} style={tile}><MonitorPlay size={18} color="#ef4444" /> Video</button>
                  <button onClick={() => handleAddBlock('FORM')} style={tile}><Mail size={18} color="#a855f7" /> Form</button>
                  <button onClick={() => handleAddBlock('TESTIMONIAL')} style={tile}><MessageSquareQuote size={18} color="#3b82f6" /> Testimonial</button>
                  <button onClick={() => handleAddBlock('ICON_BOX')} style={tile}><Star size={18} color="#eab308" /> Icon Box</button>
                  {userRole === 'admin' && <button onClick={() => handleAddBlock('HTML')} style={tile}><Code size={18} color="#f59e0b" /> Custom HTML</button>}
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="BASIC ELEMENTS" defaultOpen={false}>
                <div style={grid2}>
                  <button onClick={() => handleAddBlock('TEXT')} style={tile}><Type size={18} color="#38bdf8" /> Paragraph</button>
                  <button onClick={() => handleAddBlock('IMAGE')} style={tile}><ImageIcon size={18} color="#a78bfa" /> Image</button>
                  <button onClick={() => handleAddBlock('BUTTON')} style={tile}><SquareChartGantt size={18} color="#f472b6" /> Button</button>
                  <button onClick={() => handleAddBlock('GRID')} style={tile}><LayoutGrid size={18} color="#94a3b8" /> Simple Grid</button>
                </div>
              </SidebarAccordion>
            </div>
          )}
        </div>

        {!isEditingMaster && (
          <div style={{ padding: '10px', borderTop: '1px solid #1e293b', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <EditorDraftStatus />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => savePage(false).then(res => { if (!res) return; alert(res.success ? 'Draft saved!' : 'Save FAILED: ' + (res.message || 'unexpected response') + '\nYour changes are still here and backed up on this device.'); })} style={{ ...btnStyle, margin: 0, flex: 1, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', justifyContent: 'center' }}><Save size={16} /> Save Draft</button>
              <button onClick={publishSite} disabled={isPublishing} style={{ ...btnStyle, margin: 0, flex: 1, background: '#3b82f6', border: 'none', color: '#fff', justifyContent: 'center', opacity: isPublishing ? 0.7 : 1 }}><Globe size={16} /> Publish Online</button>
            </div>
            {activePage?.is_draft_copy == 1 && (
              <button onClick={discardChanges} style={{ ...btnStyle, margin: 0, background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', justifyContent: 'center' }}>
                <AlertCircle size={16} /> Discard Changes
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: isEditingMaster ? '50px' : 0, bottom: 0, right: rightOpen ? 0 : '-300px', width: '300px', zIndex: 50, transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex' }}>
        <button onClick={() => setRightOpen(!rightOpen)} style={{ position: 'absolute', left: '-32px', top: '20px', width: '32px', height: '40px', background: '#0f172a', border: '1px solid #334155', borderRight: 'none', borderRadius: '8px 0 0 8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '-2px 0 5px rgba(0,0,0,0.1)' }}>
          {rightOpen ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
        </button>
        <div style={{ flex: 1, background: '#0f172a', borderLeft: '1px solid #334155', boxShadow: '-4px 0 25px rgba(0,0,0,0.2)', overflowY: 'auto', height: '100%' }}>
          <PropertyPanel />
        </div>
      </div>

    </div>
  );
}
