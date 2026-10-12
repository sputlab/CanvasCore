import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, Sliders, Palette, Shield, Save, Trash2, Crown, FileEdit, MousePointerClick } from 'lucide-react';
import MediaPickerModal from './MediaPickerModal';
import { IconButton, Button } from '../ui/kit';
import { notify } from '../ui/notify';
import { blockInfo, CONTAINER_TYPES } from '../editor/blockCatalog';
import { findLiveBlock } from './panel/helpers';
import { CONTENT_PANELS } from './panel/blocks';
import StyleTab from './panel/StyleTab';
import AdvancedTab from './panel/AdvancedTab';
import PageSettings from './panel/PageSettings';
import { confirmDialog, promptDialog } from '../ui/dialog';

// Editor right panel. With no block selected it shows the page settings; with a block selected,
// three tabs: Content (the block's own panel, src/components/panel/blocks/), Style and Advanced
// (shared by every block). The first section of each tab starts open.
const TABS = [['content', 'Content', Sliders], ['style', 'Style', Palette], ['advanced', 'Advanced', Shield]];

export default function PropertyPanel() {
  const { blocks, selectedBlockId, setSelectedBlockId, updateBlock, removeBlock, activePage, updateActivePage, pages, fetchTemplates, enterMasterEditMode, saveAsMaster, userRole } = useStore();

  // Blocks from templates, imports or older pages may have no "content"/"styles" (e.g. SECTION/CONTAINER):
  // the panel reads them directly, so it always gets objects (a crash here blanks the whole editor).
  const foundBlock = findLiveBlock(blocks, selectedBlockId);
  const selectedBlock = foundBlock && (!foundBlock.content || !foundBlock.styles)
    ? { ...foundBlock, content: foundBlock.content || {}, styles: foundBlock.styles || {} }
    : foundBlock;

  const [activeTab, setActiveTab] = useState('content');
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);
  const [collections, setCollections] = useState([]);
  const coverInputRef = useRef(null);
  useEffect(() => { fetch('api.php?action=get_collections').then(r => r.json()).then(d => { if (Array.isArray(d)) setCollections(d); }).catch(() => {}); }, []);

  const handleSaveTemplate = async () => {
    const name = await promptDialog({ title: 'Save as template', message: 'A reusable copy of this block, under Add › My templates.', label: 'Template name', placeholder: 'e.g. Pricing table', confirmLabel: 'Save template' });
    if (!name || name.trim() === '') return;
    try {
      await fetch('api.php?action=save_template', { method: 'POST', body: JSON.stringify({ name, content_json: JSON.stringify(selectedBlock) }) });
      fetchTemplates(); notify(`Template "${name}" saved. Find it under Add › My templates.`);
    } catch { notify('Could not save the template.', 'error'); }
  };
  const handleCreateMaster = async () => {
    const name = await promptDialog({ title: 'Make a global master', message: 'The block becomes shared: edit it once and it changes on every page that uses it.', label: 'Master name', placeholder: 'e.g. Main Header', confirmLabel: 'Create master' });
    if (!name || name.trim() === '') return;
    await saveAsMaster(selectedBlock.id, name);
  };
  const handleDeleteBlock = async () => {
    const info = blockInfo(selectedBlock.type);
    const inside = selectedBlock.children && selectedBlock.children.length;
    if (await confirmDialog({ title: `Delete this ${info.label} block?`, message: inside ? 'Everything inside it is deleted too. You can undo it with Ctrl+Z.' : 'You can undo it with Ctrl+Z.', confirmLabel: 'Delete block', danger: true })) removeBlock(selectedBlock.id);
  };

  // Content is ALWAYS read from the store (not from the last render's copy): two edits in quick succession
  // must not overwrite each other.
  const liveContent = () => {
    const cur = selectedBlock ? findLiveBlock(useStore.getState().blocks, selectedBlock.id) : null;
    return (cur || selectedBlock || {}).content || {};
  };
  const handleContentChange = (property, value) => updateBlock(selectedBlock.id, { content: { ...liveContent(), [property]: value } });
  const patchContent = (patch) => updateBlock(selectedBlock.id, { content: { ...liveContent(), ...patch } });
  // Styles likewise come from the store, so quick successive edits (or two in one handler) all stick.
  const liveStyles = () => {
    const cur = selectedBlock ? findLiveBlock(useStore.getState().blocks, selectedBlock.id) : null;
    return (cur || selectedBlock || {}).styles || {};
  };
  const handleStyleChange = (property, value) => updateBlock(selectedBlock.id, { styles: { ...liveStyles(), [property]: value } });
  // Several style properties in one update
  const patchStyles = (patch) => updateBlock(selectedBlock.id, { styles: { ...liveStyles(), ...patch } });

  // Helpers for list blocks: immutable updates (no mutation of the store state)
  const lstOf = (key) => { const v = liveContent()[key]; return Array.isArray(v) ? v : []; };
  const lstPatch = (key, idx, patch) => handleContentChange(key, lstOf(key).map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const lstRemove = (key, idx) => handleContentChange(key, lstOf(key).filter((_, i) => i !== idx));
  const lstAdd = (key, item) => handleContentChange(key, [...lstOf(key), item]);
  const lstMove = (key, idx, dir) => {
    const l = [...lstOf(key)]; const j = idx + dir;
    if (j < 0 || j >= l.length) return;
    [l[idx], l[j]] = [l[j], l[idx]];
    handleContentChange(key, l);
  };

  const renderMediaPicker = () => {
    if (!mediaPickerTarget) return null;
    return <MediaPickerModal onClose={() => setMediaPickerTarget(null)} onSelect={(url) => {
      if (typeof mediaPickerTarget === 'string') {
        handleContentChange(mediaPickerTarget, url);
      } else if (mediaPickerTarget.type === 'grid_item') {
        handleContentChange('items', lstOf('items').map((it, i) => (i === mediaPickerTarget.index ? it + `<img src="${url}" style="max-width:100%; border-radius:8px; display:block; margin: 10px 0;" />` : it)));
      } else if (mediaPickerTarget.type === 'slider_img') {
        lstPatch('images', mediaPickerTarget.index, { src: url });
      } else if (mediaPickerTarget.type === 'gallery_img') {
        handleContentChange('images', (selectedBlock.content.images || []).map((im, i) => (i === mediaPickerTarget.index ? { ...im, src: url } : im)));
      } else if (mediaPickerTarget.type === 'gallery_add') {
        handleContentChange('images', [...(selectedBlock.content.images || []), { src: url, alt: '', caption: '' }]);
      } else if (mediaPickerTarget.type === 'logo_img') {
        handleContentChange('logos', (selectedBlock.content.logos || []).map((x, i) => (i === mediaPickerTarget.index ? { ...x, src: url } : x)));
      } else if (mediaPickerTarget.type === 'logo_add') {
        handleContentChange('logos', [...(selectedBlock.content.logos || []), { src: url, alt: '', href: '' }]);
      } else if (mediaPickerTarget.type === 'team_photo') {
        handleContentChange('members', (selectedBlock.content.members || []).map((x, i) => (i === mediaPickerTarget.index ? { ...x, photo: url } : x)));
      } else if (mediaPickerTarget.type === 'ba_before' || mediaPickerTarget.type === 'ba_after') {
        const k = mediaPickerTarget.type === 'ba_before' ? 'before' : 'after';
        handleContentChange(k, { ...(selectedBlock.content[k] || {}), src: url });
      }
      setMediaPickerTarget(null);
    }} />;
  };

  if (!selectedBlock) {
    return <PageSettings ctx={{ activePage, updateActivePage, pages, collections, coverInputRef }} />;
  }

  const info = blockInfo(selectedBlock.type);
  const head = (color, actions) => (
    <div className="cc-pp-head">
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <IconButton icon={ChevronLeft} label="Back to page settings (Esc)" size="sm" onClick={() => setSelectedBlockId(null)} />
        <info.icon size={15} color={color || info.color} aria-hidden="true" />
        <strong className="cc-pp-title">{info.label}</strong>
      </span>
      <span className="ui-row" style={{ gap: 4, flexWrap: 'nowrap' }}>{actions}</span>
    </div>
  );

  if (selectedBlock.type === 'MASTER') {
    return (
      <div className="cc-pp">
        {head('#fcd34d', <IconButton icon={Trash2} label="Remove this master from the page" size="sm" onClick={handleDeleteBlock} style={{ color: '#f87171' }} />)}
        <div style={{ padding: 14 }}>
          <div className="ui-card" style={{ textAlign: 'center' }}>
            <Crown size={30} color="#fcd34d" style={{ marginBottom: 8 }} aria-hidden="true" />
            <h3 style={{ margin: '0 0 8px', color: '#f8fafc', fontSize: 15 }}>{selectedBlock.content?.name || 'Global Component'}</h3>
            <p className="ui-hint" style={{ fontSize: 12.5 }}>This is a global component. Changes made to it appear on every page that uses it.</p>
            <Button variant="gold" block icon={FileEdit} onClick={() => enterMasterEditMode(selectedBlock.content.masterId)} style={{ marginTop: 14 }}>Edit Global Master</Button>
          </div>
        </div>
      </div>
    );
  }

  // Layout blocks have no Content tab; the tab in use falls back to Style for them
  const ContentPanel = CONTENT_PANELS[selectedBlock.type];
  const tabs = TABS.filter(([id]) => id !== 'content' || !['SECTION', 'CONTAINER', 'FLEX_ROW'].includes(selectedBlock.type));
  const tab = tabs.some(([id]) => id === activeTab) ? activeTab : tabs[0][0];
  const c = selectedBlock.content || {};
  const ctx = {
    selectedBlock, c, set: handleContentChange, handleContentChange, patchContent, handleStyleChange, patchStyles, updateBlock, setMediaPickerTarget,
    pick: (type, index) => () => setMediaPickerTarget(index === undefined ? { type } : { type, index }),
    ARS: [['16 / 9', '16:9'], ['4 / 3', '4:3'], ['3 / 2', '3:2'], ['1 / 1', '1:1'], ['21 / 9', '21:9']],
    pages, collections, lstOf, lstPatch, lstRemove, lstAdd, lstMove, userRole,
  };

  return (
    <div className="cc-pp">
      {renderMediaPicker()}
      {head(null, <>
        <IconButton icon={Save} label="Save as template (a reusable copy)" size="sm" onClick={handleSaveTemplate} style={{ color: '#c4b5fd' }} />
        <Button variant="gold" size="sm" icon={Crown} onClick={handleCreateMaster} title="Make it a global master: edit once, update everywhere">Master</Button>
        <IconButton icon={Trash2} label="Delete block" size="sm" onClick={handleDeleteBlock} style={{ color: '#f87171' }} />
      </>)}

      <div className="ui-tabs" role="tablist" aria-label="Block settings" style={{ background: '#0f172a' }}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" className="ui-tab" aria-selected={tab === id} onClick={() => setActiveTab(id)}>
            <Icon size={14} aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      <div style={{ padding: 12 }} role="tabpanel">
        {tab === 'content' && (ContentPanel
          ? <ContentPanel ctx={ctx} />
          : (
            <div className="ui-hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 8 }}>
              <MousePointerClick size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
              {CONTAINER_TYPES.includes(selectedBlock.type) ? 'Add blocks inside this container from the Add panel; set its look in Style.' : 'Edit this block directly on the canvas; set its look in Style.'}
            </div>
          ))}
        {tab === 'style' && <StyleTab ctx={ctx} />}
        {tab === 'advanced' && <AdvancedTab ctx={ctx} />}
      </div>
    </div>
  );
}
