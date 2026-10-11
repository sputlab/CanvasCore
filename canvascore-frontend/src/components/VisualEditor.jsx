import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import PropertyPanel from './PropertyPanel';
import Canvas from './Canvas';
import LayerNavigator from './LayerNavigator';
import EditorDraftStatus from './EditorDraftStatus';
import { useEditorDraft } from '../session/hooks';
import { clearDraft } from '../session/drafts';
import { editorScope } from '../session/draftTrackers';
import AddBlocksPanel from './AddBlocksPanel';
import {
  ChevronLeft, Monitor, Tablet, Smartphone, Undo2, Redo2, Save, Globe, Layers, PlusCircle, Crown, AlertCircle,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { Button, IconButton, Segmented, Badge } from '../ui/kit';
import { notify } from '../ui/notify';
import { CONTAINER_TYPES } from '../editor/blockCatalog';

// Remembered per browser: which side panels are open
const readPanels = () => { try { return JSON.parse(localStorage.getItem('cc_editor_panels') || '{}'); } catch { return {}; } };
const writePanels = (v) => { try { localStorage.setItem('cc_editor_panels', JSON.stringify(v)); } catch { /* private mode */ } };

export default function VisualEditor() {
  const {
    activePage, setView, blocks, addBlock, updateActivePage,
    viewport, setViewport, undo, redo, pastBlocks, futureBlocks,
    fetchTemplates, publishSiteAsync, selectedBlockId, setSelectedBlockId,
    fetchMasters, isEditingMaster, exitMasterEditMode, setPages,
  } = useStore();

  const [isPublishing, setIsPublishing] = useState(false);
  const saveDraftRef = useRef(null); // Ctrl+S handler → the current saveDraft
  // On narrow screens the panels cover the canvas, so they start closed there
  const [panels, setPanels] = useState(() => ((window.innerWidth || 1280) < 860 ? { left: false, right: false } : { left: true, right: true, ...readPanels() }));
  const togglePanel = (side) => setPanels((p) => { const n = { ...p, [side]: !p[side] }; writePanels(n); return n; });
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
      const typing = !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        // Save draft: a text being edited is committed first (it saves when it loses focus)
        e.preventDefault();
        if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
        setTimeout(() => saveDraftRef.current && saveDraftRef.current(), 0);
        return;
      }
      if (typing) return; // typing: the field has its own undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (e.key === 'Escape' && useStore.getState().selectedBlockId) setSelectedBlockId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, fetchTemplates, fetchMasters, setSelectedBlockId]);

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
        notify('Not published: saving the page failed' + (saved && saved.message ? ' (' + saved.message + ')' : '') + '.\nYour changes are still here and backed up on this device.', 'error');
        setIsPublishing(false);
        return;
      }
      const res = await publishSiteAsync();
      if (res && res.success) notify(`Published. ${res.message || ''}`.trim());
      else notify(`Error: ${res?.message || 'Server unreachable'}`, 'error');

      // Update the global state to reflect the changes in the dashboard
      fetch('api.php?action=get_pages').then(r => r.json()).then(d => setPages(d));
    } catch {
      notify('Error publishing.', 'error');
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
    if (block && CONTAINER_TYPES.includes(block.type)) return block.id;
    return null;
  };

  const handleAddBlock = (type) => {
    const targetId = getValidParentId();
    addBlock(type, targetId);
  };

  const saveDraft = () => savePage(false).then((res) => {
    if (!res) return;
    if (res.success) notify(activePage?.__part ? 'Saved.' : 'Draft saved.');
    else notify('Save FAILED: ' + (res.message || 'unexpected response') + '\nYour changes are still here and backed up on this device.', 'error');
  });
  useEffect(() => { saveDraftRef.current = isEditingMaster ? null : saveDraft; });

  const leave = () => {
    if (useStore.getState().editorDirty && !window.confirm('You have unsaved changes.\n\nThey stay backed up on this device and will be offered for restore next time, but they are NOT saved to the site.\n\nLeave the editor anyway?')) return;
    setSelectedBlockId(null);
    setView(activePage?.__item ? 'collections' : activePage?.__part ? 'settings' : 'manager');
  };

  const parentId = getValidParentId();
  const findType = (nodes, id) => { for (const n of nodes || []) { if (n.id === id) return n.type; const r = findType(n.children, id); if (r) return r; } return null; };
  const targetType = parentId ? findType(blocks, parentId) : null;
  const kind = activePage?.__part ? (activePage.__part === 'header' ? 'Global header' : 'Global footer') : activePage?.__item ? 'Collection item' : null;
  const backLabel = activePage?.__item ? 'Collections' : activePage?.__part ? 'Global Options' : 'Pages';

  return (
    <div className="cc-editor">
      {isEditingMaster ? (
        <header className="cc-ed-top cc-ed-top--master">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Crown size={17} aria-hidden="true" /> <strong>Editing a global master</strong>
            <span className="cc-ed-hide-sm">— changes apply everywhere it is used.</span>
          </span>
          <span className="ui-row" style={{ flexWrap: 'nowrap' }}>
            <button type="button" onClick={() => exitMasterEditMode(false)} className="cc-ed-master-btn">Cancel</button>
            <button type="button" onClick={() => exitMasterEditMode(true)} className="cc-ed-master-btn cc-ed-master-btn--solid">Save Master &amp; Close</button>
          </span>
        </header>
      ) : (
        <header className="cc-ed-top">
          <div className="cc-ed-top__group" style={{ minWidth: 0, flex: '1 1 0' }}>
            <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={leave} title={`Back to ${backLabel}`}>{backLabel}</Button>
            <span className="cc-ed-sep" />
            <span className="cc-ed-title" title={activePage?.title}>{activePage?.title || 'Untitled page'}</span>
            {kind ? <Badge tone="accent">{kind}</Badge> : <span className="cc-ed-hide-sm"><StatusBadgeFor page={activePage} /></span>}
            <span className="cc-ed-hide-md"><EditorDraftStatus /></span>
          </div>
          <div className="cc-ed-top__group" style={{ justifyContent: 'center' }}>
            <Segmented label="Preview size" value={viewport} onChange={setViewport} options={[
              ['desktop', null, Monitor, 'Desktop'], ['tablet', null, Tablet, 'Tablet'], ['mobile', null, Smartphone, 'Mobile'],
            ]} />
            <IconButton icon={Undo2} label="Undo (Ctrl+Z)" size="sm" onClick={undo} disabled={pastBlocks.length === 0} />
            <IconButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" size="sm" onClick={redo} disabled={futureBlocks.length === 0} />
          </div>
          <div className="cc-ed-top__group" style={{ justifyContent: 'flex-end', flex: '1 1 0' }}>
            {activePage?.is_draft_copy == 1 && (
              <Button variant="danger" size="sm" icon={AlertCircle} onClick={discardChanges} title="Throw away the draft and go back to the published version"><span className="cc-ed-hide-md">Discard draft</span></Button>
            )}
            <Button size="sm" icon={Save} onClick={saveDraft} title="Save draft (Ctrl+S)"><span className="cc-ed-hide-sm">{activePage?.__part ? 'Save' : 'Save Draft'}</span></Button>
            <Button variant="primary" size="sm" icon={Globe} onClick={publishSite} disabled={isPublishing} title="Save and publish online">{isPublishing ? 'Publishing…' : 'Publish'}</Button>
          </div>
        </header>
      )}

      <div className="cc-ed-body">
        <aside className="cc-ed-left" data-open={panels.left} aria-label="Add blocks and page structure">
          <div className="ui-tabs" role="tablist" aria-label="Left panel">
            <button type="button" role="tab" className="ui-tab" aria-selected={leftTab === 'add'} onClick={() => setLeftTab('add')}><PlusCircle size={14} aria-hidden="true" /> Add</button>
            <button type="button" role="tab" className="ui-tab" aria-selected={leftTab === 'nav'} onClick={() => setLeftTab('nav')}><Layers size={14} aria-hidden="true" /> Layers</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {leftTab === 'nav' ? <LayerNavigator /> : <AddBlocksPanel onAdd={handleAddBlock} targetType={targetType} parentId={parentId} />}
          </div>
        </aside>
        <button type="button" className="cc-ed-toggle cc-ed-toggle--left" onClick={() => togglePanel('left')}
          aria-label={panels.left ? 'Hide the left panel' : 'Show the left panel'} title={panels.left ? 'Hide panel' : 'Show panel'}>
          {panels.left ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>

        <main className="cc-ed-canvas" aria-label="Page canvas">
          <Canvas />
        </main>

        <button type="button" className="cc-ed-toggle cc-ed-toggle--right" onClick={() => togglePanel('right')}
          aria-label={panels.right ? 'Hide the settings panel' : 'Show the settings panel'} title={panels.right ? 'Hide panel' : 'Show panel'}>
          {panels.right ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
        <aside className="cc-ed-right" data-open={panels.right} aria-label="Settings">
          <PropertyPanel />
        </aside>
      </div>

      {editorRestored && (
        <div role="status" className="cc-ed-restored">
          <span><strong>Restored unsaved changes</strong> from your previous session. They are <strong>not saved to the site yet</strong>: use Save Draft or Publish to keep them.</span>
          <Button size="sm" variant="ghost" onClick={() => {
            if (!window.confirm('Discard the restored changes? The page goes back to its last saved version.')) return;
            clearDraft(editorScope(useStore.getState()));
            draft.discard();
            setSelectedBlockId(null); setView('manager');
          }}>Discard</Button>
        </div>
      )}
    </div>
  );
}

function StatusBadgeFor({ page }) {
  if (!page) return null;
  if (Number(page.is_draft_copy)) return <Badge tone="modified">Modified · draft</Badge>;
  if (page.status === 'published') return <Badge tone="published">Published</Badge>;
  return <Badge tone="draft">Draft</Badge>;
}
