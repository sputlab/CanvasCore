import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { AlignLeft, AlignCenter, AlignRight, Layout, BoxSelect, MoveUp, Globe, FileEdit, ChevronLeft, Sliders, Palette, Shield, Save, Image as ImageIcon, X, Upload, Trash2, Eraser, MapPin, Images, HelpCircle, Columns3, Mail, SquareChartGantt, Type, Code, MonitorPlay, Star, MessageSquareQuote, Crown, Library, Rows3, PanelTop, CreditCard, GalleryHorizontal, ArrowUp, ArrowDown, SeparatorHorizontal, Info, ListOrdered, Hash, BarChart3, Table2, Timer, History, Building2, Users, GitCompare, Store, Clock } from 'lucide-react';
import JoditEditor from 'jodit-react';

// Converte un titolo in slug: minuscole, trattini al posto degli spazi/caratteri.
export const slugify = (str) => (str || '')
  .toString()
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // rimuove accenti
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const handleNumericKey = (e, val, onChange) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const strVal = String(val || '0px');
    const match = strVal.match(/^(-?\d+)(\D*)$/);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2] || 'px';
      const newVal = e.key === 'ArrowUp' ? num + 1 : num - 1;
      onChange(newVal + unit);
    } else {
      onChange(e.key === 'ArrowUp' ? '1px' : '0px');
    }
  }
};

const PanelAccordion = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '10px', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', background: '#1e293b' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f8fafc', cursor: 'pointer', fontSize: '12.5px', fontWeight: 'bold' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && <Icon size={16} color="#38bdf8" />}
          {title}
        </div>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: '10px' }}>▼</span>
      </button>
      {isOpen && <div style={{ padding: '12px', borderTop: '1px solid #334155', background: '#0f172a' }}>{children}</div>}
    </div>
  );
};

const SpacingControl = ({ label, value, onChange }) => {
  const vals = value ? value.split(' ') : ['0px', '0px', '0px', '0px'];
  const t = vals[0] || '0px'; const r = vals[1] || t; const b = vals[2] || t; const l = vals[3] || r;
  const update = (idx, val) => { const newVals = [t, r, b, l]; newVals[idx] = val; onChange(newVals.join(' ')); };
  const inputStyle = { width: '65px', height: '28px', textAlign: 'center', fontSize: '11px', border: '1px solid #334155', borderRadius: '4px', background: '#0f172a', color: '#f8fafc', padding: '0 4px', boxSizing: 'border-box' };

  return (
    <div style={{ marginBottom: '5px' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
        {label}
        <span style={{fontWeight:'normal', fontSize:'9px', color:'#64748b'}}>(px, rem, % - Use ↑/↓)</span>
      </label>
      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ fontSize: '9px', color: '#64748b', width:'25px', textAlign:'right', fontWeight:'bold' }}>TOP</span><input type="text" value={t} onChange={e => update(0, e.target.value)} onKeyDown={e => handleNumericKey(e, t, val => update(0, val))} style={inputStyle} /></div>
        <div style={{ display: 'flex', gap: '20px', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ fontSize: '9px', color: '#64748b', width:'25px', textAlign:'right', fontWeight:'bold' }}>LEFT</span><input type="text" value={l} onChange={e => update(3, e.target.value)} onKeyDown={e => handleNumericKey(e, l, val => update(3, val))} style={inputStyle} /></div>
          <div style={{ width: '20px', height: '20px', background: '#334155', borderRadius: '4px' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><input type="text" value={r} onChange={e => update(1, e.target.value)} onKeyDown={e => handleNumericKey(e, r, val => update(1, val))} style={inputStyle} /><span style={{ fontSize: '9px', color: '#64748b', fontWeight:'bold' }}>RIGHT</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ fontSize: '9px', color: '#64748b', width:'25px', textAlign:'right', fontWeight:'bold' }}>BOT</span><input type="text" value={b} onChange={e => update(2, e.target.value)} onKeyDown={e => handleNumericKey(e, b, val => update(2, val))} style={inputStyle} /></div>
      </div>
    </div>
  );
};

// ---- UI condivisa per i blocchi a liste (Accordion, Tabs, Pricing, Gallery) ----
const lstIconBtn = (disabled) => ({ background: 'transparent', border: 'none', color: '#94a3b8', cursor: disabled ? 'default' : 'pointer', padding: '3px', display: 'flex', opacity: disabled ? 0.3 : 1 });
const lstAddBtn = { width: '100%', padding: '8px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' };

const ItemCard = ({ title, index, total, onMove, onRemove, children }) => (
  <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #334155' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{title}</span>
      <div style={{ display: 'flex', gap: '2px' }}>
        <button disabled={index === 0} onClick={() => onMove(-1)} title="Move up" style={lstIconBtn(index === 0)}><ArrowUp size={13} /></button>
        <button disabled={index === total - 1} onClick={() => onMove(1)} title="Move down" style={lstIconBtn(index === total - 1)}><ArrowDown size={13} /></button>
        <button onClick={onRemove} title="Remove" style={{ ...lstIconBtn(false), color: '#ef4444' }}><Trash2 size={13} /></button>
      </div>
    </div>
    {children}
  </div>
);

// ---- campi riusabili per i pannelli dei blocchi "contenuto" (Divider, Callout, Steps, ...) ----
const fldInput = { width: '100%', padding: '6px 9px', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', backgroundColor: '#1e293b', color: '#f8fafc', boxSizing: 'border-box' };
const fldLabel = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px', marginTop: '7px' };
const Fld = ({ label, children }) => (<div>{label && <label style={fldLabel}>{label}</label>}{children}</div>);
const TxtF = ({ label, value, onChange, placeholder, multiline, rows, mono }) => (
  <Fld label={label}>
    {multiline
      ? <textarea rows={rows || 3} style={{ ...fldInput, resize: 'vertical', ...(mono ? { fontFamily: 'monospace', fontSize: '11px' } : {}) }} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      : <input type="text" style={fldInput} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
  </Fld>
);
const NumF = ({ label, value, onChange, min, max, step, placeholder }) => (
  <Fld label={label}><input type="number" min={min} max={max} step={step} style={fldInput} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></Fld>
);
const SelF = ({ label, value, onChange, options }) => (
  <Fld label={label}><select style={fldInput} value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Fld>
);
const ChkF = ({ label, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '8px' }}><input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} /> {label}</label>
);
const ColorF = ({ label, value, onChange, placeholder }) => {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value || '');
  return (
    <Fld label={label}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input type="color" value={hex ? value : '#cbd5e1'} onChange={e => onChange(e.target.value)} style={{ width: '34px', height: '30px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} />
        <input type="text" style={{ ...fldInput, flex: 1 }} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder || '#cbd5e1'} />
      </div>
    </Fld>
  );
};
const ImgF = ({ label, value, onChange, onPick }) => (
  <Fld label={label}>
    <div style={{ display: 'flex', gap: '6px' }}>
      {value ? <img src={value} alt="" style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} /> : null}
      <input type="text" style={{ ...fldInput, flex: 1 }} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder="Image URL" />
      <button onClick={onPick} title="Pick from media" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 9px', cursor: 'pointer' }}><ImageIcon size={13} /></button>
    </div>
  </Fld>
);
const UTC_OFFSETS = ['local', ...Array.from({ length: 27 }, (_, i) => { const h = i - 12; return (h < 0 ? '-' : '+') + String(Math.abs(h)).padStart(2, '0') + ':00'; }), '+05:30', '+09:30'];
const BUSINESS_TYPES = ['LocalBusiness', 'Restaurant', 'Store', 'CafeOrCoffeeShop', 'Dentist', 'HairSalon', 'HealthAndBeautyBusiness', 'ProfessionalService', 'LegalService', 'AutoRepair', 'Hotel', 'Organization'];
const DEFAULT_HOURS = [
  { day: 'Monday', open: '09:00', close: '18:00', closed: false }, { day: 'Tuesday', open: '09:00', close: '18:00', closed: false },
  { day: 'Wednesday', open: '09:00', close: '18:00', closed: false }, { day: 'Thursday', open: '09:00', close: '18:00', closed: false },
  { day: 'Friday', open: '09:00', close: '18:00', closed: false }, { day: 'Saturday', open: '09:00', close: '13:00', closed: false },
  { day: 'Sunday', open: '', close: '', closed: true },
];

const findLiveBlock = (nodes, id) => {
  for (const n of nodes || []) {
    if (n.id === id) return n;
    if (n.children) { const r = findLiveBlock(n.children, id); if (r) return r; }
  }
  return null;
};

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
      if (!data.success) alert(data.message || "Upload error");
      fetchMedia();
    } catch { alert("Network error"); }
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

export default function PropertyPanel() {
  const { blocks, selectedBlockId, setSelectedBlockId, updateBlock, removeBlock, activePage, updateActivePage, pages, fetchTemplates, enterMasterEditMode, saveAsMaster , userRole} = useStore();

  const findBlockDeep = (nodes, id) => {
    for (let node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findBlockDeep(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  const selectedBlock = findBlockDeep(blocks, selectedBlockId);

  const [activeTab, setActiveTab] = useState('content');
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);

  const labelStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px', marginTop: '7px' };
  const inputStyle = { width: '100%', padding: '6px 9px', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', backgroundColor: '#1e293b', color: '#f8fafc', boxSizing: 'border-box' };
  const tabStyle = (tab) => ({ flex: 1, padding: '12px 0', background: activeTab === tab ? '#1e293b' : 'transparent', color: activeTab === tab ? '#38bdf8' : '#94a3b8', border: 'none', borderBottom: activeTab === tab ? '2px solid #38bdf8' : '2px solid transparent', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' });

  const editorConfig = { readonly: false, toolbarAdaptive: false, buttons: ['bold', 'italic', 'underline', 'strikethrough', 'font', 'fontsize', 'color', 'align', 'link', 'source'] };

  const handleSaveTemplate = async () => {
    const name = window.prompt("Template Name (Local Copy):");
    if (!name || name.trim() === '') return;
    try {
      await fetch('api.php?action=save_template', { method: 'POST', body: JSON.stringify({ name, content_json: JSON.stringify(selectedBlock) }) });
      fetchTemplates(); alert(`Template saved!`);
    } catch { alert("Error"); }
  };

  const handleCreateMaster = async () => {
    const name = window.prompt("Global Master Name (e.g., Main Header):");
    if (!name || name.trim() === '') return;
    await saveAsMaster(selectedBlock.id, name);
  };

  const handleDeleteBlock = () => { if (window.confirm("Are you sure you want to delete this element?")) removeBlock(selectedBlock.id); };
  const [collections, setCollections] = useState([]);
  const coverInputRef = useRef(null);
  useEffect(() => { fetch('api.php?action=get_collections').then(r => r.json()).then(d => { if (Array.isArray(d)) setCollections(d); }).catch(() => {}); }, []);

  // Il contenuto si legge SEMPRE dallo store (non dalla copia dell'ultimo render): due modifiche ravvicinate
  // non devono sovrascriversi a vicenda.
  const liveContent = () => {
    const cur = selectedBlock ? findLiveBlock(useStore.getState().blocks, selectedBlock.id) : null;
    return (cur || selectedBlock || {}).content || {};
  };
  const handleContentChange = (property, value) => updateBlock(selectedBlock.id, { content: { ...liveContent(), [property]: value } });
  const handleStyleChange = (property, value) => updateBlock(selectedBlock.id, { styles: { ...selectedBlock.styles, [property]: value } });

  // Helper per i blocchi a liste: aggiornamenti immutabili (niente mutazione dello stato dello store)
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

  // Pannelli dei blocchi "contenuto". Ogni modifica passa da handleContentChange (aggiornamenti immutabili).
  const renderContentPanels = () => {
    const t = selectedBlock.type;
    const c = selectedBlock.content || {};
    const set = handleContentChange;
    const pick = (type, index) => () => setMediaPickerTarget(index === undefined ? { type } : { type, index });
    const ARS = [['16 / 9', '16:9'], ['4 / 3', '4:3'], ['3 / 2', '3:2'], ['1 / 1', '1:1'], ['21 / 9', '21:9']];

    switch (t) {
      case 'DIVIDER': {
        const shape = ['wave', 'curve', 'diagonal'].includes(c.style);
        const line = ['line', 'gradient'].includes(c.style || 'line');
        return (
          <PanelAccordion title="Divider" icon={SeparatorHorizontal} defaultOpen={true}>
            <SelF label="Style" value={c.style || 'line'} onChange={v => set('style', v)} options={[['line', 'Line'], ['gradient', 'Gradient line'], ['dots', 'Dots'], ['wave', 'Wave'], ['curve', 'Curve'], ['diagonal', 'Diagonal'], ['spacer', 'Spacer (empty space)']]} />
            {c.style !== 'spacer' && <ColorF label="Color" value={c.color} onChange={v => set('color', v)} />}
            {(line || c.style === 'dots') && <NumF label="Thickness / size (1–20)" min={1} max={20} value={c.thickness ?? 2} onChange={v => set('thickness', v)} />}
            {line && <NumF label="Width % (10–100)" min={10} max={100} value={c.width ?? 100} onChange={v => set('width', v)} />}
            {(shape || c.style === 'spacer') && <NumF label="Height px (10–400)" min={10} max={400} value={c.height ?? 80} onChange={v => set('height', v)} />}
            {shape && <ChkF label="Flip vertically (use at the bottom of a section)" checked={c.flip} onChange={v => set('flip', v)} />}
            {shape && <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Tip: set the section above/below to the shape&apos;s color for a seamless transition.</p>}
          </PanelAccordion>
        );
      }
      case 'CALLOUT':
        return (
          <PanelAccordion title="Callout" icon={Info} defaultOpen={true}>
            <SelF label="Type" value={c.variant || 'info'} onChange={v => set('variant', v)} options={[['info', 'Info'], ['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['note', 'Note']]} />
            <TxtF label="Title (optional)" value={c.title} onChange={v => set('title', v)} />
            <TxtF label="Text (HTML allowed)" value={c.text} onChange={v => set('text', v)} multiline rows={5} mono />
            <ChkF label="Show icon" checked={c.showIcon !== false} onChange={v => set('showIcon', v)} />
          </PanelAccordion>
        );
      case 'STEPS':
        return (
          <>
            <PanelAccordion title="Steps" icon={ListOrdered} defaultOpen={true}>
              {lstOf('items').map((it, i) => (
                <ItemCard key={i} title={`Step ${i + 1}`} index={i} total={lstOf('items').length} onMove={(d) => lstMove('items', i, d)} onRemove={() => lstRemove('items', i)}>
                  <TxtF label="Title" value={it.title} onChange={v => lstPatch('items', i, { title: v })} />
                  <TxtF label="Text" value={it.text} onChange={v => lstPatch('items', i, { text: v })} multiline rows={2} />
                </ItemCard>
              ))}
              <button onClick={() => lstAdd('items', { title: 'New step', text: '' })} style={lstAddBtn}>+ Add step</button>
            </PanelAccordion>
            <PanelAccordion title="Steps Layout" icon={Sliders} defaultOpen={false}>
              <SelF label="Layout" value={c.layout || 'horizontal'} onChange={v => set('layout', v)} options={[['horizontal', 'Horizontal (columns)'], ['vertical', 'Vertical (list)']]} />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The horizontal layout becomes vertical on small screens.</p>
            </PanelAccordion>
          </>
        );
      case 'COUNTERS':
        return (
          <>
            <PanelAccordion title="Counters" icon={Hash} defaultOpen={true}>
              {lstOf('items').map((it, i) => (
                <ItemCard key={i} title={`Counter ${i + 1}`} index={i} total={lstOf('items').length} onMove={(d) => lstMove('items', i, d)} onRemove={() => lstRemove('items', i)}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '6px' }}>
                    <NumF label="Value" value={it.value} onChange={v => lstPatch('items', i, { value: v })} />
                    <NumF label="Decimals" min={0} max={2} value={it.decimals ?? 0} onChange={v => lstPatch('items', i, { decimals: v })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <TxtF label="Prefix" value={it.prefix} onChange={v => lstPatch('items', i, { prefix: v })} placeholder="$" />
                    <TxtF label="Suffix" value={it.suffix} onChange={v => lstPatch('items', i, { suffix: v })} placeholder="+ / %" />
                  </div>
                  <TxtF label="Label" value={it.label} onChange={v => lstPatch('items', i, { label: v })} />
                </ItemCard>
              ))}
              <button onClick={() => lstAdd('items', { value: 100, prefix: '', suffix: '', decimals: 0, label: 'New counter' })} style={lstAddBtn}>+ Add counter</button>
            </PanelAccordion>
            <PanelAccordion title="Counters Settings" icon={Sliders} defaultOpen={false}>
              <SelF label="Columns" value={c.columns || 0} onChange={v => set('columns', Number(v))} options={[[0, 'Auto (one per counter)'], [1, '1'], [2, '2'], [3, '3'], [4, '4']]} />
              <ChkF label="Count up when scrolled into view" checked={c.animate !== false} onChange={v => set('animate', v)} />
              {c.animate !== false && <NumF label="Duration ms (500–5000)" min={500} max={5000} step={100} value={c.duration ?? 1800} onChange={v => set('duration', v)} />}
              <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The final number is always in the page (also without JavaScript). Animation is skipped for visitors who prefer reduced motion.</p>
            </PanelAccordion>
          </>
        );
      case 'PROGRESS':
        return (
          <>
            <PanelAccordion title="Progress Bars" icon={BarChart3} defaultOpen={true}>
              {lstOf('items').map((it, i) => (
                <ItemCard key={i} title={`Bar ${i + 1}`} index={i} total={lstOf('items').length} onMove={(d) => lstMove('items', i, d)} onRemove={() => lstRemove('items', i)}>
                  <TxtF label="Label" value={it.label} onChange={v => lstPatch('items', i, { label: v })} />
                  <NumF label="Value % (0–100)" min={0} max={100} value={it.value} onChange={v => lstPatch('items', i, { value: v })} />
                  <ColorF label="Color (empty = brand color)" value={it.color} onChange={v => lstPatch('items', i, { color: v })} placeholder="brand color" />
                </ItemCard>
              ))}
              <button onClick={() => lstAdd('items', { label: 'New skill', value: 50, color: '' })} style={lstAddBtn}>+ Add bar</button>
            </PanelAccordion>
            <PanelAccordion title="Progress Settings" icon={Sliders} defaultOpen={false}>
              <NumF label="Bar height px (4–30)" min={4} max={30} value={c.height ?? 10} onChange={v => set('height', v)} />
              <ChkF label="Show percentage" checked={c.showValue !== false} onChange={v => set('showValue', v)} />
              <ChkF label="Fill when scrolled into view" checked={c.animate !== false} onChange={v => set('animate', v)} />
            </PanelAccordion>
          </>
        );
      case 'TABLE':
        return (
          <>
            <PanelAccordion title="Data Table" icon={Table2} defaultOpen={true}>
              <TxtF label="Data — one row per line, cells separated by | or Tab" value={c.data} onChange={v => set('data', v)} multiline rows={9} mono placeholder={'Name | Role | City\nAnna | CEO | Rome'} />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>Tip: you can paste straight from Excel or Google Sheets (cells arrive separated by Tab).</p>
              <TxtF label="Caption (optional)" value={c.caption} onChange={v => set('caption', v)} />
            </PanelAccordion>
            <PanelAccordion title="Table Options" icon={Sliders} defaultOpen={false}>
              <ChkF label="First row is the header" checked={c.headerRow !== false} onChange={v => set('headerRow', v)} />
              <ChkF label="First column is a header (row labels)" checked={c.rowHeaders} onChange={v => set('rowHeaders', v)} />
              <ChkF label="Striped rows" checked={c.striped !== false} onChange={v => set('striped', v)} />
              <ChkF label="Cell borders" checked={c.bordered} onChange={v => set('bordered', v)} />
              <ChkF label="Compact" checked={c.compact} onChange={v => set('compact', v)} />
              <ChkF label="Sticky header (scrolls inside)" checked={c.stickyHeader} onChange={v => set('stickyHeader', v)} />
              {c.stickyHeader && <NumF label="Max height px" min={0} max={1200} value={c.maxHeight ?? 0} onChange={v => set('maxHeight', v)} />}
            </PanelAccordion>
          </>
        );
      case 'COUNTDOWN':
        return (
          <>
            <PanelAccordion title="Countdown" icon={Timer} defaultOpen={true}>
              <Fld label="Target date & time"><input type="datetime-local" style={fldInput} value={c.datetime || ''} onChange={e => set('datetime', e.target.value)} /></Fld>
              <SelF label="Time zone" value={c.utcOffset || 'local'} onChange={v => set('utcOffset', v)} options={UTC_OFFSETS.map(o => [o, o === 'local' ? "Visitor's local time" : 'UTC' + o])} />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>A fixed UTC offset does not follow daylight-saving changes: pick the offset that applies on the target date.</p>
              <SelF label="When it ends" value={c.endAction || 'message'} onChange={v => set('endAction', v)} options={[['message', 'Show a message'], ['hide', 'Hide the block']]} />
              {(c.endAction || 'message') === 'message' && <TxtF label="Message" value={c.endMessage} onChange={v => set('endMessage', v)} placeholder="It's here!" />}
            </PanelAccordion>
            <PanelAccordion title="Countdown Display" icon={Sliders} defaultOpen={false}>
              <ChkF label="Show seconds" checked={c.showSeconds !== false} onChange={v => set('showSeconds', v)} />
              <ChkF label="Show the date under the numbers" checked={c.showDate !== false} onChange={v => set('showDate', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <TxtF label="Days label" value={c.labelDays} onChange={v => set('labelDays', v)} placeholder="Days" />
                <TxtF label="Hours label" value={c.labelHours} onChange={v => set('labelHours', v)} placeholder="Hours" />
                <TxtF label="Minutes label" value={c.labelMinutes} onChange={v => set('labelMinutes', v)} placeholder="Minutes" />
                <TxtF label="Seconds label" value={c.labelSeconds} onChange={v => set('labelSeconds', v)} placeholder="Seconds" />
              </div>
            </PanelAccordion>
          </>
        );
      case 'TIMELINE':
        return (
          <>
            <PanelAccordion title="Timeline" icon={History} defaultOpen={true}>
              {lstOf('items').map((it, i) => (
                <ItemCard key={i} title={`Event ${i + 1}`} index={i} total={lstOf('items').length} onMove={(d) => lstMove('items', i, d)} onRemove={() => lstRemove('items', i)}>
                  <TxtF label="Date / period" value={it.date} onChange={v => lstPatch('items', i, { date: v })} placeholder="2024" />
                  <TxtF label="Title" value={it.title} onChange={v => lstPatch('items', i, { title: v })} />
                  <TxtF label="Text" value={it.text} onChange={v => lstPatch('items', i, { text: v })} multiline rows={2} />
                </ItemCard>
              ))}
              <button onClick={() => lstAdd('items', { date: '', title: 'New event', text: '' })} style={lstAddBtn}>+ Add event</button>
            </PanelAccordion>
            <PanelAccordion title="Timeline Layout" icon={Sliders} defaultOpen={false}>
              <SelF label="Layout" value={c.layout || 'left'} onChange={v => set('layout', v)} options={[['left', 'Line on the left'], ['alternate', 'Alternating (desktop)']]} />
            </PanelAccordion>
          </>
        );
      case 'LOGOS':
        return (
          <>
            <PanelAccordion title="Logos" icon={Building2} defaultOpen={true}>
              <TxtF label="Heading (optional)" value={c.title} onChange={v => set('title', v)} placeholder="Trusted by" />
              {lstOf('logos').map((lg, i) => (
                <ItemCard key={i} title={`Logo ${i + 1}`} index={i} total={lstOf('logos').length} onMove={(d) => lstMove('logos', i, d)} onRemove={() => lstRemove('logos', i)}>
                  <ImgF label="Image" value={lg.src} onChange={v => lstPatch('logos', i, { src: v })} onPick={pick('logo_img', i)} />
                  <TxtF label="Name (alt text)" value={lg.alt} onChange={v => lstPatch('logos', i, { alt: v })} />
                  <TxtF label="Link (optional)" value={lg.href} onChange={v => lstPatch('logos', i, { href: v })} placeholder="https://…" />
                </ItemCard>
              ))}
              <button onClick={pick('logo_add')} style={{ ...lstAddBtn, marginBottom: '6px' }}>+ Add logo from media</button>
              <button onClick={() => lstAdd('logos', { src: '', alt: '', href: '' })} style={{ ...lstAddBtn, borderStyle: 'solid', borderWidth: '1px', color: '#94a3b8' }}>+ Add empty slot (paste URL)</button>
            </PanelAccordion>
            <PanelAccordion title="Logos Layout" icon={Sliders} defaultOpen={false}>
              <SelF label="Layout" value={c.layout || 'grid'} onChange={v => set('layout', v)} options={[['grid', 'Grid'], ['marquee', 'Scrolling strip']]} />
              {(c.layout || 'grid') === 'grid' && <SelF label="Columns" value={c.columns || 5} onChange={v => set('columns', Number(v))} options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => [n, String(n)])} />}
              {c.layout === 'marquee' && <NumF label="Loop duration s (10–120)" min={10} max={120} value={c.speed ?? 30} onChange={v => set('speed', v)} />}
              <NumF label="Logo height px (20–120)" min={20} max={120} value={c.height ?? 48} onChange={v => set('height', v)} />
              <NumF label="Gap px (8–80)" min={8} max={80} value={c.gap ?? 40} onChange={v => set('gap', v)} />
              <ChkF label="Grayscale (color on hover)" checked={c.grayscale !== false} onChange={v => set('grayscale', v)} />
              {c.layout === 'marquee' && <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Pauses on hover; static for visitors who prefer reduced motion.</p>}
            </PanelAccordion>
          </>
        );
      case 'TEAM':
        return (
          <>
            <PanelAccordion title="Team Members" icon={Users} defaultOpen={true}>
              {lstOf('members').map((m, i) => (
                <ItemCard key={i} title={m.name || `Member ${i + 1}`} index={i} total={lstOf('members').length} onMove={(d) => lstMove('members', i, d)} onRemove={() => lstRemove('members', i)}>
                  <TxtF label="Name" value={m.name} onChange={v => lstPatch('members', i, { name: v })} />
                  <TxtF label="Role" value={m.role} onChange={v => lstPatch('members', i, { role: v })} />
                  <TxtF label="Short bio" value={m.bio} onChange={v => lstPatch('members', i, { bio: v })} multiline rows={2} />
                  <ImgF label="Photo (empty = initials)" value={m.photo} onChange={v => lstPatch('members', i, { photo: v })} onPick={pick('team_photo', i)} />
                  <TxtF label="Email" value={m.email} onChange={v => lstPatch('members', i, { email: v })} />
                  <TxtF label="LinkedIn" value={m.linkedin} onChange={v => lstPatch('members', i, { linkedin: v })} placeholder="linkedin.com/in/…" />
                  <TxtF label="X / Twitter" value={m.twitter} onChange={v => lstPatch('members', i, { twitter: v })} />
                  <TxtF label="Website" value={m.website} onChange={v => lstPatch('members', i, { website: v })} />
                </ItemCard>
              ))}
              <button onClick={() => lstAdd('members', { name: 'New member', role: '', bio: '', photo: '', email: '', linkedin: '', twitter: '', website: '' })} style={lstAddBtn}>+ Add member</button>
            </PanelAccordion>
            <PanelAccordion title="Team Layout" icon={Sliders} defaultOpen={false}>
              <SelF label="Columns" value={c.columns || 0} onChange={v => set('columns', Number(v))} options={[[0, 'Auto'], [1, '1'], [2, '2'], [3, '3'], [4, '4']]} />
              <SelF label="Style" value={c.layout || 'card'} onChange={v => set('layout', v)} options={[['card', 'Cards'], ['minimal', 'Minimal']]} />
              <SelF label="Photo shape" value={c.photoShape || 'circle'} onChange={v => set('photoShape', v)} options={[['circle', 'Circle'], ['rounded', 'Rounded'], ['square', 'Square']]} />
            </PanelAccordion>
          </>
        );
      case 'BEFORE_AFTER': {
        const side = (key, title, pickType) => {
          const o = c[key] || {};
          const patch = (p) => set(key, { ...o, ...p });
          return (
            <ItemCard title={title} index={0} total={1} onMove={() => {}} onRemove={() => {}}>
              <ImgF label="Image" value={o.src} onChange={v => patch({ src: v })} onPick={pick(pickType)} />
              <TxtF label="Alt text" value={o.alt} onChange={v => patch({ alt: v })} />
              <TxtF label="Label" value={o.label} onChange={v => patch({ label: v })} />
            </ItemCard>
          );
        };
        return (
          <>
            <PanelAccordion title="Before / After" icon={GitCompare} defaultOpen={true}>
              {side('before', 'BEFORE (left)', 'ba_before')}
              {side('after', 'AFTER (right)', 'ba_after')}
              <p style={{ fontSize: '11px', color: '#64748b', margin: '0' }}>Use two images with the same size and framing.</p>
            </PanelAccordion>
            <PanelAccordion title="Compare Settings" icon={Sliders} defaultOpen={false}>
              <Fld label={`Starting position (${c.startPosition ?? 50}%)`}><input type="range" min="0" max="100" style={{ width: '100%' }} value={c.startPosition ?? 50} onChange={e => set('startPosition', Number(e.target.value))} /></Fld>
              <SelF label="Aspect ratio" value={c.aspectRatio || '16 / 9'} onChange={v => set('aspectRatio', v)} options={ARS} />
              <ChkF label="Show Before / After labels" checked={c.showLabels !== false} onChange={v => set('showLabels', v)} />
            </PanelAccordion>
          </>
        );
      }
      case 'BUSINESS': {
        const hours = Array.isArray(c.hours) ? c.hours : [];
        return (
          <>
            <PanelAccordion title="Business Details" icon={Store} defaultOpen={true}>
              <TxtF label="Business name" value={c.name} onChange={v => set('name', v)} />
              <SelF label="Business type (for Google)" value={c.businessType || 'LocalBusiness'} onChange={v => set('businessType', v)} options={BUSINESS_TYPES.map(b => [b, b])} />
              <TxtF label="Address (one line per row)" value={c.address} onChange={v => set('address', v)} multiline rows={3} />
              <TxtF label="Phone" value={c.phone} onChange={v => set('phone', v)} />
              <TxtF label="Email" value={c.email} onChange={v => set('email', v)} />
              <TxtF label="Website" value={c.website} onChange={v => set('website', v)} />
              <ChkF label="Show a “Get directions” button (Google Maps)" checked={c.mapsLink !== false} onChange={v => set('mapsLink', v)} />
              {c.mapsLink !== false && <TxtF label="Button text" value={c.directionsLabel} onChange={v => set('directionsLabel', v)} placeholder="Get directions" />}
            </PanelAccordion>
            <PanelAccordion title="Opening Hours" icon={Clock} defaultOpen={false}>
              {hours.length === 0 ? (
                <button onClick={() => set('hours', DEFAULT_HOURS)} style={lstAddBtn}>+ Add weekly hours</button>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px 74px 24px', gap: '4px', fontSize: '10px', color: '#64748b', fontWeight: 700 }}><span>DAY (label)</span><span>OPENS</span><span>CLOSES</span><span title="Closed">✕</span></div>
                  {hours.map((hr, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 74px 74px 24px', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                      <input type="text" style={fldInput} value={hr.day ?? ''} onChange={e => lstPatch('hours', i, { day: e.target.value })} />
                      <input type="time" style={fldInput} value={hr.open || ''} disabled={!!hr.closed} onChange={e => lstPatch('hours', i, { open: e.target.value })} />
                      <input type="time" style={fldInput} value={hr.close || ''} disabled={!!hr.closed} onChange={e => lstPatch('hours', i, { close: e.target.value })} />
                      <input type="checkbox" title="Closed" checked={!!hr.closed} onChange={e => lstPatch('hours', i, { closed: e.target.checked })} />
                    </div>
                  ))}
                  <button onClick={() => set('hours', [])} style={{ ...lstAddBtn, marginTop: '8px', borderStyle: 'solid', borderWidth: '1px', color: '#94a3b8' }}>Remove opening hours</button>
                </>
              )}
              <TxtF label="Section title" value={c.hoursTitle} onChange={v => set('hoursTitle', v)} placeholder="Opening hours" />
              <TxtF label="“Closed” text" value={c.closedLabel} onChange={v => set('closedLabel', v)} placeholder="Closed" />
              <TxtF label="Note (optional)" value={c.note} onChange={v => set('note', v)} placeholder="Closed on public holidays" />
              <ChkF label="Add structured data for Google (LocalBusiness)" checked={c.jsonLd !== false} onChange={v => set('jsonLd', v)} />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Day labels can be in any language; Google always receives the standard day names, in order Monday → Sunday.</p>
            </PanelAccordion>
          </>
        );
      }
      default:
        return null;
    }
  };



  const renderMediaPicker = () => {
    if (!mediaPickerTarget) return null;
    return <MediaPickerModal onClose={() => setMediaPickerTarget(null)} onSelect={(url) => {
      if (typeof mediaPickerTarget === 'string') {
        handleContentChange(mediaPickerTarget, url);
      } else if (mediaPickerTarget.type === 'grid_item') {
        const newItems = [...selectedBlock.content.items];
        newItems[mediaPickerTarget.index] += `<img src="${url}" style="max-width:100%; border-radius:8px; display:block; margin: 10px 0;" />`;
        updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, items: newItems } });
      } else if (mediaPickerTarget.type === 'slider_img') {
        const newImgs = [...selectedBlock.content.images];
        newImgs[mediaPickerTarget.index].src = url;
        updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, images: newImgs } });
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
    // Nascondiamo il suffisso di bozza dall'utente in UI per evitare confusione
    const displaySlug = activePage?.slug || '';

    return (
      <div style={{ paddingBottom: '40px', color: '#f8fafc' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #1e293b', background: '#0f172a', position: 'sticky', top: 0, zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', color: '#38bdf8' }}><FileEdit size={16} /> Page Settings</h3>
        </div>
        <div style={{ padding: '20px' }}>

          {activePage?.__item && (
            <PanelAccordion title="Item Settings" icon={FileEdit} defaultOpen={true}>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={activePage.status || 'draft'} onChange={e => updateActivePage({ status: e.target.value })}>
                <option value="draft">Draft (not published)</option>
                <option value="published">Published</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', margin: '12px 0' }}>
                <input type="checkbox" checked={!!activePage.archived} onChange={e => updateActivePage({ archived: e.target.checked })} /> Archived (moved to the archive list)
              </label>

              <label style={labelStyle}>Date</label>
              <input type="date" style={inputStyle} value={activePage.date || ''} onChange={e => updateActivePage({ date: e.target.value })} />

              <label style={{ ...labelStyle, marginTop: '12px' }}>Cover image</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" style={{ ...inputStyle, flex: 1 }} value={activePage.cover_image || ''} onChange={e => updateActivePage({ cover_image: e.target.value })} placeholder="/uploads/cover.jpg" />
                <button onClick={() => coverInputRef.current && coverInputRef.current.click()} style={{ padding: '0 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Upload size={13} /></button>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
                  const fd = new FormData(); fd.append('file', f);
                  try { const r = await fetch('api.php?action=upload_media', { method: 'POST', body: fd }); const d = await r.json(); if (d.success && d.url) updateActivePage({ cover_image: d.url }); } catch { /* noop */ }
                }} />
              </div>
              {activePage.cover_image && <img src={activePage.cover_image} alt="" style={{ marginTop: '8px', width: '100%', borderRadius: '8px', display: 'block' }} />}

              <label style={{ ...labelStyle, marginTop: '12px' }}>Excerpt</label>
              <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={activePage.excerpt || ''} onChange={e => updateActivePage({ excerpt: e.target.value })} placeholder="Short summary shown in lists" />
            </PanelAccordion>
          )}

          <PanelAccordion title="Page Info" icon={FileEdit} defaultOpen={false}>
            <label style={labelStyle}>Internal Title</label>
            <input type="text" value={activePage?.title || ''} onChange={(e) => {
              const title = e.target.value;
              const published = ['published', 'modified'].includes(activePage?.status);
              const autoSlug = !activePage?._slugEdited && !published && !Number(activePage?.is_draft_copy);
              if (autoSlug) updateActivePage({ title, slug: slugify(title) });
              else updateActivePage({ title });
            }} style={inputStyle} />

            <label style={labelStyle}>URL (Slug)</label>
            <input type="text" value={displaySlug} onChange={(e) => {
              const cleanedSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              updateActivePage({ slug: cleanedSlug, _slugEdited: true });
            }} onBlur={(e) => updateActivePage({ slug: slugify(e.target.value), _slugEdited: true })} style={inputStyle} />
          </PanelAccordion>

          <PanelAccordion title="Page Structure" icon={Layout} defaultOpen={false}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc', fontWeight: 'bold', marginBottom: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!Number(activePage?.is_home)} onChange={e => updateActivePage({ is_home: e.target.checked ? 1 : 0 })} style={{ width: '16px', height: '16px' }} />
              Set as Homepage (site root)
            </label>
            <p style={{ margin: '0 0 15px 0', fontSize: '11px', color: '#64748b' }}>The homepage is published at the site root (index.html), whatever its slug is.</p>
            <label style={labelStyle}>Page Layout</label>
            <select style={inputStyle} value={activePage?.layout || 'boxed'} onChange={e => updateActivePage({layout: e.target.value})}>
              <option value="boxed">Boxed (Centered)</option>
              <option value="full">Full Width</option>
            </select>
            {activePage?.layout !== 'full' && (
              <>
                <label style={labelStyle}>Maximum Width (e.g. 1200px or 90%)</label>
                <input type="text" style={inputStyle} value={activePage?.boxed_width || '1200px'} onChange={e => updateActivePage({boxed_width: e.target.value})} />
              </>
            )}
            <label style={labelStyle}>Background Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="color" value={activePage?.bg_color || '#ffffff'} onChange={e => updateActivePage({bg_color: e.target.value})} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }} />
              <input type="text" value={activePage?.bg_color || '#ffffff'} onChange={e => updateActivePage({bg_color: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
            </div>
          </PanelAccordion>

          <PanelAccordion title="SEO & Meta Data" icon={Globe} defaultOpen={false}>
            <label style={labelStyle}>Meta Title</label>
            <input type="text" value={activePage?.seo_title || ''} onChange={e => updateActivePage({seo_title: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Meta Description</label>
            <textarea value={activePage?.seo_description || ''} onChange={e => updateActivePage({seo_description: e.target.value})} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
            <label style={{...labelStyle, marginTop: '12px'}}>Social Share Image (OG)</label>
            <input type="text" value={activePage?.seo_image || ''} onChange={e => updateActivePage({ seo_image: e.target.value })} placeholder="/uploads/share.png (optional)" style={inputStyle} />
          </PanelAccordion>
        </div>
      </div>
    );
  }

  if (selectedBlock.type === 'MASTER') {
    return (
      <div style={{ paddingBottom: '40px', color: '#f8fafc' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #1e293b', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setSelectedBlockId(null)} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}><ChevronLeft size={16}/></button>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#fcd34d', display:'flex', alignItems:'center', gap:'5px' }}><Crown size={14}/> MASTER COMPONENT</span>
          </div>
          <button onClick={handleDeleteBlock} style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14}/></button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
            <Crown size={32} color="#fcd34d" style={{ marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>{selectedBlock.content?.name || 'Global Component'}</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              This is a global component. Changes made here will reflect across the entire site.
            </p>
            <button
             onClick={() => enterMasterEditMode(selectedBlock.content.masterId)}
             style={{ width: '100%', padding: '12px', background: '#fcd34d', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
             <FileEdit size={16} /> Edit Global Master
           </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px', color: '#f8fafc' }}>
      {renderMediaPicker()}

      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setSelectedBlockId(null)} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}><ChevronLeft size={16}/></button>
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#38bdf8' }}>
            {selectedBlock.type === 'IMAGE_TEXT' ? 'IMAGE + TEXT' : selectedBlock.type}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleSaveTemplate} style={{ background: '#1e293b', border: '1px solid #334155', color: '#a78bfa', fontSize: '11px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px', borderRadius: '6px' }} title="Save Local Copy"><Save size={12}/></button>
          <button onClick={handleCreateMaster} style={{ background: '#451a03', border: '1px solid #78350f', color: '#fde68a', fontSize: '11px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '6px' }} title="Create Global Component"><Crown size={12}/> Master</button>
          <button onClick={handleDeleteBlock} style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete Element"><Eraser size={14}/></button>
        </div>
      </div>

      <div style={{ display: 'flex', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
        {selectedBlock.type !== 'SECTION' && selectedBlock.type !== 'CONTAINER' && selectedBlock.type !== 'FLEX_ROW' && (
          <button onClick={() => setActiveTab('content')} style={tabStyle('content')}><Sliders size={14}/> Content</button>
        )}
        <button onClick={() => setActiveTab('style')} style={tabStyle('style')}><Palette size={14}/> Style</button>
        <button onClick={() => setActiveTab('advanced')} style={tabStyle('advanced')}><Shield size={14}/> Advanced</button>
      </div>

      <div style={{ padding: '15px' }}>

        {/* --- CONTENT TAB --- */}
        {activeTab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>

            {selectedBlock.type === 'HERO' && (
              <>
                <PanelAccordion title="Background & Titles" icon={Layout} defaultOpen={false}>
                  <label style={labelStyle}>Hero Background Image</label>
                  <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    <input type="text" style={{...inputStyle, flex: 1}} value={selectedBlock.content.bgImage || ''} onChange={e => handleContentChange('bgImage', e.target.value)} />
                    <button onClick={() => setMediaPickerTarget('bgImage')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
                  </div>
                  <label style={labelStyle}>Main Title</label>
                  <div style={{ background: '#fff', borderRadius: '6px', color: '#0f172a', marginBottom:'10px' }}>
                    <JoditEditor value={selectedBlock.content.title || ''} config={editorConfig} onBlur={(val) => handleContentChange('title', val)} />
                  </div>
                  <label style={labelStyle}>Subtitle</label>
                  <div style={{ background: '#fff', borderRadius: '6px', color: '#0f172a' }}>
                    <JoditEditor value={selectedBlock.content.subtitle || ''} config={editorConfig} onBlur={(val) => handleContentChange('subtitle', val)} />
                  </div>
                </PanelAccordion>

                <PanelAccordion title="Hero Buttons" icon={Sliders} defaultOpen={false}>
                  {(selectedBlock.content.buttons || []).map((btn, index) => (
                    <div key={index} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label style={{...labelStyle, margin: 0}}>Button {index + 1}</label>
                        <button onClick={() => {
                          const newBtns = [...selectedBlock.content.buttons]; newBtns.splice(index, 1); handleContentChange('buttons', newBtns);
                        }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
                      </div>
                      <input type="text" style={{...inputStyle, marginBottom: '8px'}} value={btn.text} onChange={e => {
                        const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].text = e.target.value; handleContentChange('buttons', newBtns);
                      }} placeholder="Button Text" />
                      <select style={{...inputStyle, marginBottom: '8px'}} value={btn.url} onChange={e => {
                        const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].url = e.target.value; handleContentChange('buttons', newBtns);
                      }}>
                        <option value="#">Select internal page...</option>
                        {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>📄 {p.title}</option>)}
                      </select>
                      <input type="text" style={inputStyle} placeholder="Custom URL..." value={btn.url} onChange={e => {
                        const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].url = e.target.value; handleContentChange('buttons', newBtns);
                      }} />
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <div style={{ flex: 1 }}><label style={{fontSize:'10px', color:'#cbd5e1', display:'block'}}>BG</label><input type="color" value={btn.bgColor} onChange={e => {
                          const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].bgColor = e.target.value; handleContentChange('buttons', newBtns);
                        }} style={{width:'100%', border:'none', height:'30px', cursor:'pointer'}}/></div>
                        <div style={{ flex: 1 }}><label style={{fontSize:'10px', color:'#cbd5e1', display:'block'}}>Text</label><input type="color" value={btn.textColor} onChange={e => {
                          const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].textColor = e.target.value; handleContentChange('buttons', newBtns);
                        }} style={{width:'100%', border:'none', height:'30px', cursor:'pointer'}}/></div>
                        <div style={{ flex: 1 }}>
                          <label style={{fontSize:'10px', color:'#cbd5e1', display:'block'}}>Radius</label>
                          <input type="text" value={btn.borderRadius} onChange={e => {
                            const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].borderRadius = e.target.value; handleContentChange('buttons', newBtns);
                          }} onKeyDown={e => handleNumericKey(e, btn.borderRadius, val => {
                            const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].borderRadius = val; handleContentChange('buttons', newBtns);
                          })} style={{...inputStyle, padding:'4px', height:'30px'}} title="Press Up/Down arrow"/>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => {
                    const newBtns = selectedBlock.content.buttons ? [...selectedBlock.content.buttons] : [];
                    newBtns.push({ text: 'New Button', url: '#', bgColor: '#10b981', textColor: '#ffffff', borderRadius: '8px' });
                    handleContentChange('buttons', newBtns);
                  }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Button</button>
                </PanelAccordion>
              </>
            )}

            {selectedBlock.type === 'FORM' && (
              <>
                <PanelAccordion title="Form Settings" icon={Mail} defaultOpen={false}>
                  <label style={labelStyle}>Form Title</label>
                  <div style={{ background: '#fff', borderRadius: '6px', color: '#0f172a', marginBottom: '15px' }}>
                    <JoditEditor value={selectedBlock.content.title || '<h3>Contact Us</h3>'} config={editorConfig} onBlur={(val) => handleContentChange('title', val)} />
                  </div>
                  <label style={labelStyle}>Receiving Email</label>
                  <input type="email" style={inputStyle} value={selectedBlock.content.email || ''} onChange={e => handleContentChange('email', e.target.value)} placeholder="Leave blank for Global Email" />
                  <label style={labelStyle}>Submit Button Text</label>
                  <input type="text" style={inputStyle} value={selectedBlock.content.btnText || ''} onChange={e => handleContentChange('btnText', e.target.value)} />
                </PanelAccordion>

                <PanelAccordion title="Form Fields" icon={Layout} defaultOpen={false}>
                  {(selectedBlock.content.fields || []).map((field, idx) => (
                    <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <label style={{...labelStyle, margin: 0}}>Field {idx + 1}</label>
                        <button onClick={() => {
                          const flds = [...(selectedBlock.content.fields || [])]; flds.splice(idx, 1); handleContentChange('fields', flds);
                        }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
                      </div>
                      <input type="text" value={field.label} onChange={e => {
                        const flds = [...(selectedBlock.content.fields || [])]; flds[idx].label = e.target.value; handleContentChange('fields', flds);
                      }} style={{...inputStyle, marginBottom:'5px'}} placeholder="Label (e.g. Name)" />
                      <select value={field.type} onChange={e => {
                        const flds = [...(selectedBlock.content.fields || [])]; flds[idx].type = e.target.value; handleContentChange('fields', flds);
                      }} style={{...inputStyle, marginBottom: '5px'}}>
                        <option value="text">Short Text</option><option value="email">Email</option><option value="textarea">Long Text</option><option value="number">Number</option>
                      </select>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input type="checkbox" checked={!!field.required} onChange={e => {
                          const flds = [...(selectedBlock.content.fields || [])]; flds[idx].required = e.target.checked; handleContentChange('fields', flds);
                        }} /> Required Field
                      </label>
                    </div>
                  ))}
                  <button onClick={() => {
                    const flds = selectedBlock.content.fields ? [...selectedBlock.content.fields] : [];
                    flds.push({ label: 'New Field', type: 'text', required: false });
                    handleContentChange('fields', flds);
                  }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Field</button>
                </PanelAccordion>
              </>
            )}

            {selectedBlock.type === 'CSS_GRID' && (
              <>
                <PanelAccordion title="CSS Grid Setup" icon={Columns3} defaultOpen={false}>
                  <label style={labelStyle}>Number of Columns</label>
                  <input type="number" style={inputStyle} value={selectedBlock.content.columns || 2} onChange={e => handleContentChange('columns', parseInt(e.target.value))} />
                  <label style={labelStyle}>Gap (Spacing)</label>
                  <input type="text" style={inputStyle} value={selectedBlock.content.gap || '20px'} onChange={e => handleContentChange('gap', e.target.value)} />
                  <p style={{fontSize: '11px', color: '#94a3b8', marginTop: '10px'}}>Add elements inside this grid via the Navigator to see columns.</p>
                </PanelAccordion>
              </>
            )}

            {['GRID', 'CARDS'].includes(selectedBlock.type) && (
              <>
                <PanelAccordion title="Grid Settings" icon={Columns3} defaultOpen={false}>
                  <label style={labelStyle}>Number of Columns: {selectedBlock.content.columns || 2}</label>
                  <input type="range" min="1" max="24" style={{ width: '100%', cursor: 'pointer' }} value={parseInt(selectedBlock.content.columns) || 2}
                    onChange={e => {
                      const cols = parseInt(e.target.value);
                      const currentItems = selectedBlock.content.items || [];
                      const newItems = Array(cols).fill('').map((_, i) => currentItems[i] !== undefined ? currentItems[i] : `<p>Column ${i+1}</p>`);
                      updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, columns: cols, items: newItems } });
                    }} />
                </PanelAccordion>

                <PanelAccordion title="Columns Content" icon={Layout} defaultOpen={false}>
                  {selectedBlock.content.items.map((item, idx) => (
                    <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #334155' }}>
                      <label style={{...labelStyle, marginTop: 0}}>Item {idx + 1}</label>
                      <textarea rows="4" style={inputStyle} value={item} onChange={e => {
                        const newItems = [...selectedBlock.content.items]; newItems[idx] = e.target.value; updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, items: newItems } });
                      }} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                        <button onClick={() => setMediaPickerTarget({ type: 'grid_item', index: idx })} style={{ flex: 1, padding: '6px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>+ Image</button>
                        <button onClick={() => {
                          const newItems = [...selectedBlock.content.items]; newItems[idx] += `<a href="#" style="display:inline-block; padding:10px 20px; background:#3b82f6; color:#fff; border-radius:6px; text-decoration:none; margin-top:10px; font-weight:bold;">Click Here</a>`;
                          updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, items: newItems } });
                        }} style={{ flex: 1, padding: '6px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>+ Button</button>
                      </div>
                    </div>
                  ))}
                </PanelAccordion>
              </>
            )}

            {selectedBlock.type === 'FAQ' && (
              <PanelAccordion title="FAQ Items" icon={HelpCircle} defaultOpen={false}>
                {(selectedBlock.content.items || []).map((item, idx) => (
                  <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <label style={{...labelStyle, margin: 0}}>Question {idx + 1}</label>
                      <button onClick={() => {
                        const newItems = [...selectedBlock.content.items]; newItems.splice(idx, 1); handleContentChange('items', newItems);
                      }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
                    </div>
                    <input type="text" style={{...inputStyle, marginBottom:'10px'}} value={item.q} onChange={e => {
                      const newItems = [...selectedBlock.content.items]; newItems[idx].q = e.target.value; handleContentChange('items', newItems);
                    }} placeholder="Question" />
                    <textarea rows="3" style={inputStyle} value={item.a} onChange={e => {
                      const newItems = [...selectedBlock.content.items]; newItems[idx].a = e.target.value; handleContentChange('items', newItems);
                    }} placeholder="Answer" />
                  </div>
                ))}
                <button onClick={() => {
                  const newItems = selectedBlock.content.items ? [...selectedBlock.content.items] : [];
                  newItems.push({ q: 'New Question', a: 'Answer text...' });
                  handleContentChange('items', newItems);
                }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Question</button>
              </PanelAccordion>
            )}

            {selectedBlock.type === 'SLIDER' && (
              <>
                <PanelAccordion title="Slider Settings" icon={Sliders} defaultOpen={false}>
                  <label style={labelStyle}>Transition Effect</label>
                  <select style={inputStyle} value={selectedBlock.content.effect || 'slide'} onChange={e => handleContentChange('effect', e.target.value)}>
                    <option value="slide">Slide (Horizontal Swipe)</option>
                    <option value="fade">Fade (Crossfade)</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f8fafc', margin: '15px 0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedBlock.content.autoplay ?? true} onChange={e => handleContentChange('autoplay', e.target.checked)} style={{width:'16px', height:'16px'}} /> Enable Autoplay
                  </label>
                  {selectedBlock.content.autoplay !== false && (
                    <>
                      <label style={labelStyle}>Delay (ms)</label>
                      <input type="number" style={inputStyle} value={selectedBlock.content.delay || 3000} onChange={e => handleContentChange('delay', parseInt(e.target.value))} onKeyDown={e => handleNumericKey(e, selectedBlock.content.delay, val => handleContentChange('delay', parseInt(val)))} />
                    </>
                  )}

                  <label style={{...labelStyle, marginTop: '15px'}}>Aspect Ratio</label>
                  <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.aspectRatio || '16 / 9'} onChange={e => handleContentChange('aspectRatio', e.target.value)}>
                    <option value="1 / 1">1:1 (Square)</option>
                  <option value="4 / 3">4:3</option>
                  <option value="3 / 2">3:2</option>
                  <option value="16 / 9">16:9 (Wide)</option>
                  <option value="21 / 9">21:9 (Ultra-wide)</option>
                  <option value="2 / 3">2:3 (Portrait)</option>
                  </select>

                  <label style={labelStyle}>Image Fit</label>
                  <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.objectFit || 'cover'} onChange={e => handleContentChange('objectFit', e.target.value)}>
                    <option value="cover">Cover (fill and crop)</option>
                    <option value="contain">Contain (show full)</option>
                    <option value="fill">Fill (stretch)</option>
                  </select>

                  <label style={labelStyle}>Focus / Object Position</label>
                  <select style={inputStyle} value={selectedBlock.content.objectPosition || 'center'} onChange={e => handleContentChange('objectPosition', e.target.value)}>
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </PanelAccordion>

                <PanelAccordion title="Images" icon={Images} defaultOpen={false}>
                  {(selectedBlock.content.images || []).map((img, idx) => (
                    <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label style={{...labelStyle, margin: 0}}>Slide {idx + 1}</label>
                        <button onClick={() => {
                          const newImgs = [...selectedBlock.content.images]; newImgs.splice(idx, 1); handleContentChange('images', newImgs);
                        }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
                      </div>
                      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                        <input type="text" style={{...inputStyle, flex: 1, marginBottom: 0}} value={img.src} onChange={e => {
                          const newImgs = [...selectedBlock.content.images]; newImgs[idx].src = e.target.value; handleContentChange('images', newImgs);
                        }} placeholder="Image URL" />
                        <button onClick={() => setMediaPickerTarget({ type: 'slider_img', index: idx })} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
                      </div>
                      <input type="text" style={inputStyle} value={img.alt || ''} onChange={e => {
                        const newImgs = [...selectedBlock.content.images]; newImgs[idx].alt = e.target.value; handleContentChange('images', newImgs);
                      }} placeholder="Alt Text (SEO)" />
                    </div>
                  ))}
                  <button onClick={() => {
                    const newImgs = selectedBlock.content.images ? [...selectedBlock.content.images] : [];
                    newImgs.push({ src: 'https://via.placeholder.com/800x400', alt: 'New Slide' });
                    handleContentChange('images', newImgs);
                  }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Slide</button>
                </PanelAccordion>
              </>
            )}

            {selectedBlock.type === 'MAPS' && (
              <PanelAccordion title="Map Settings" icon={MapPin} defaultOpen={false}>
                <label style={labelStyle}>Location / Address</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.address || ''} onChange={e => handleContentChange('address', e.target.value)} placeholder="e.g. Colosseum, Rome, Italy" />
                <label style={labelStyle}>Zoom Level: {selectedBlock.content.zoom || 15}</label>
                <input type="range" min="1" max="20" style={{ width: '100%', cursor: 'pointer' }} value={parseInt(selectedBlock.content.zoom) || 15} onChange={e => handleContentChange('zoom', e.target.value)} />
              </PanelAccordion>
            )}

            {selectedBlock.type === 'COLLECTION_LIST' && (
              <PanelAccordion title="Collection List" icon={Library} defaultOpen={true}>
                <label style={labelStyle}>Collection</label>
                <select style={inputStyle} value={selectedBlock.content.collectionId || ''} onChange={e => {
                  const c = collections.find(x => x.id === e.target.value);
                  updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, collectionId: e.target.value, collectionSlug: c ? c.slug : '', collectionName: c ? c.name : '' } });
                }}>
                  <option value="">— choose a collection —</option>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.item_count})</option>)}
                </select>
                {collections.length === 0 && <p style={{ fontSize: '11px', color: '#f59e0b', margin: '6px 0 0 0' }}>No collections yet. Create one in the Collections section.</p>}

                <label style={{ ...labelStyle, marginTop: '12px' }}>Source</label>
                <select style={inputStyle} value={selectedBlock.content.source || 'active'} onChange={e => handleContentChange('source', e.target.value)}>
                  <option value="active">Active (not archived)</option>
                  <option value="archived">Archived only</option>
                  <option value="all">All</option>
                </select>

                <label style={{ ...labelStyle, marginTop: '12px' }}>Layout</label>
                <select style={inputStyle} value={selectedBlock.content.layout || 'grid'} onChange={e => handleContentChange('layout', e.target.value)}>
                  <option value="grid">Grid (cards)</option>
                  <option value="list">List (rows)</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '12px' }}>
                  <input type="checkbox" checked={!!selectedBlock.content.showAll} onChange={e => handleContentChange('showAll', e.target.checked)} /> Show all items (ignore limit)
                </label>

                {!selectedBlock.content.showAll && <>
                  <label style={{ ...labelStyle, marginTop: '12px' }}>Items to show</label>
                  <input type="number" min="1" style={inputStyle} value={selectedBlock.content.limit || 6} onChange={e => handleContentChange('limit', parseInt(e.target.value) || 1)} />
                </>}

                {(selectedBlock.content.layout || 'grid') === 'grid' && <>
                <label style={{ ...labelStyle, marginTop: '12px' }}>Columns</label>
                <select style={inputStyle} value={selectedBlock.content.columns || 3} onChange={e => handleContentChange('columns', parseInt(e.target.value))}>
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                </select>

                </>}

                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[['showCover', 'Show cover image'], ['showDate', 'Show date'], ['showExcerpt', 'Show excerpt']].map(([k, lbl]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedBlock.content[k] !== false} onChange={e => handleContentChange(k, e.target.checked)} /> {lbl}
                    </label>
                  ))}
                </div>
              </PanelAccordion>
            )}

            {(selectedBlock.type === 'ACCORDION' || selectedBlock.type === 'TABS') && (
              <>
                <PanelAccordion title={selectedBlock.type === 'TABS' ? 'Tabs' : 'Accordion Items'} icon={selectedBlock.type === 'TABS' ? PanelTop : Rows3} defaultOpen={true}>
                  {lstOf('items').map((it, idx) => (
                    <ItemCard key={idx} title={`${selectedBlock.type === 'TABS' ? 'Tab' : 'Item'} ${idx + 1}`} index={idx} total={lstOf('items').length} onMove={(d) => lstMove('items', idx, d)} onRemove={() => lstRemove('items', idx)}>
                      <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={it.title || ''} onChange={e => lstPatch('items', idx, { title: e.target.value })} placeholder="Title" />
                      <textarea rows="4" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px' }} value={it.content || ''} onChange={e => lstPatch('items', idx, { content: e.target.value })} placeholder="Content: text or HTML (<p>, <strong>, <a>, <img>…)" />
                    </ItemCard>
                  ))}
                  <button onClick={() => lstAdd('items', { title: selectedBlock.type === 'TABS' ? 'New tab' : 'New item', content: '<p>Content…</p>' })} style={lstAddBtn}>+ Add {selectedBlock.type === 'TABS' ? 'tab' : 'item'}</button>
                </PanelAccordion>

                <PanelAccordion title={selectedBlock.type === 'TABS' ? 'Tabs Settings' : 'Accordion Settings'} icon={Sliders} defaultOpen={false}>
                  {selectedBlock.type === 'TABS' ? (
                    <>
                      <label style={labelStyle}>Style</label>
                      <select style={inputStyle} value={selectedBlock.content.variant || 'underline'} onChange={e => handleContentChange('variant', e.target.value)}>
                        <option value="underline">Underline</option>
                        <option value="pills">Pills</option>
                      </select>
                      <label style={{ ...labelStyle, marginTop: '10px' }}>Tabs alignment</label>
                      <select style={inputStyle} value={selectedBlock.content.tabAlign || 'left'} onChange={e => handleContentChange('tabAlign', e.target.value)}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <label style={labelStyle}>Style</label>
                      <select style={inputStyle} value={selectedBlock.content.variant || 'card'} onChange={e => handleContentChange('variant', e.target.value)}>
                        <option value="card">Cards</option>
                        <option value="flat">Flat (lines)</option>
                      </select>
                      <label style={{ ...labelStyle, marginTop: '10px' }}>Icon</label>
                      <select style={inputStyle} value={selectedBlock.content.icon || 'plus'} onChange={e => handleContentChange('icon', e.target.value)}>
                        <option value="plus">Plus (+)</option>
                        <option value="chevron">Chevron (▾)</option>
                        <option value="none">None</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '12px' }}>
                        <input type="checkbox" checked={!!selectedBlock.content.openFirst} onChange={e => handleContentChange('openFirst', e.target.checked)} /> First item open by default
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '8px' }}>
                        <input type="checkbox" checked={!!selectedBlock.content.allowMultiple} onChange={e => handleContentChange('allowMultiple', e.target.checked)} /> Allow several items open at once
                      </label>
                    </>
                  )}
                </PanelAccordion>
              </>
            )}

            {selectedBlock.type === 'PRICING' && (
              <>
                <PanelAccordion title="Pricing Plans" icon={CreditCard} defaultOpen={true}>
                  {lstOf('plans').map((pl, idx) => (
                    <ItemCard key={idx} title={`Plan ${idx + 1}${pl.highlighted ? ' ★' : ''}`} index={idx} total={lstOf('plans').length} onMove={(d) => lstMove('plans', idx, d)} onRemove={() => lstRemove('plans', idx)}>
                      <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={pl.name || ''} onChange={e => lstPatch('plans', idx, { name: e.target.value })} placeholder="Plan name" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                        <input type="text" style={inputStyle} value={pl.price || ''} onChange={e => lstPatch('plans', idx, { price: e.target.value })} placeholder="Price ($19)" />
                        <input type="text" style={inputStyle} value={pl.period || ''} onChange={e => lstPatch('plans', idx, { period: e.target.value })} placeholder="/month" />
                      </div>
                      <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={pl.description || ''} onChange={e => lstPatch('plans', idx, { description: e.target.value })} placeholder="Short description" />
                      <textarea rows="4" style={{ ...inputStyle, marginBottom: '6px' }} value={(pl.features || []).join('\n')} onChange={e => lstPatch('plans', idx, { features: e.target.value.split('\n') })} placeholder="Features — one per line" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                        <input type="text" style={inputStyle} value={pl.buttonText || ''} onChange={e => lstPatch('plans', idx, { buttonText: e.target.value })} placeholder="Button text" />
                        <input type="text" style={inputStyle} value={pl.buttonUrl || ''} onChange={e => lstPatch('plans', idx, { buttonUrl: e.target.value })} placeholder="URL or mailto:" />
                      </div>
                      <select style={{ ...inputStyle, marginBottom: '8px' }} value="" onChange={e => { if (e.target.value) lstPatch('plans', idx, { buttonUrl: e.target.value }); }}>
                        <option value="">Link to a page…</option>
                        {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>{p.title}</option>)}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginBottom: '6px' }}>
                        <input type="checkbox" checked={!!pl.highlighted} onChange={e => lstPatch('plans', idx, { highlighted: e.target.checked })} /> Highlight this plan
                      </label>
                      {pl.highlighted && <input type="text" style={inputStyle} value={pl.badge || ''} onChange={e => lstPatch('plans', idx, { badge: e.target.value })} placeholder="Badge (e.g. Most popular)" />}
                    </ItemCard>
                  ))}
                  <button onClick={() => lstAdd('plans', { name: 'New plan', price: '$0', period: '/month', description: '', features: ['Feature one'], buttonText: 'Choose', buttonUrl: '#', highlighted: false, badge: '' })} style={lstAddBtn}>+ Add plan</button>
                </PanelAccordion>
                <PanelAccordion title="Pricing Layout" icon={Sliders} defaultOpen={false}>
                  <label style={labelStyle}>Columns</label>
                  <select style={inputStyle} value={selectedBlock.content.columns || 0} onChange={e => handleContentChange('columns', parseInt(e.target.value, 10))}>
                    <option value={0}>Auto (one per plan)</option>
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                  </select>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The highlighted plan uses the brand color. On small screens plans stack in one column.</p>
                </PanelAccordion>
              </>
            )}

            {selectedBlock.type === 'GALLERY' && (
              <>
                <PanelAccordion title="Gallery Images" icon={GalleryHorizontal} defaultOpen={true}>
                  {lstOf('images').map((im, idx) => (
                    <ItemCard key={idx} title={`Image ${idx + 1}`} index={idx} total={lstOf('images').length} onMove={(d) => lstMove('images', idx, d)} onRemove={() => lstRemove('images', idx)}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                        {im.src ? <img src={im.src} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} /> : null}
                        <input type="text" style={{ ...inputStyle, flex: 1 }} value={im.src || ''} onChange={e => lstPatch('images', idx, { src: e.target.value })} placeholder="Image URL" />
                        <button onClick={() => setMediaPickerTarget({ type: 'gallery_img', index: idx })} title="Pick from media" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><ImageIcon size={14} /></button>
                      </div>
                      <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={im.alt || ''} onChange={e => lstPatch('images', idx, { alt: e.target.value })} placeholder="Alt text (accessibility / SEO)" />
                      <input type="text" style={inputStyle} value={im.caption || ''} onChange={e => lstPatch('images', idx, { caption: e.target.value })} placeholder="Caption (shown in lightbox / under image)" />
                    </ItemCard>
                  ))}
                  <button onClick={() => setMediaPickerTarget({ type: 'gallery_add' })} style={{ ...lstAddBtn, marginBottom: '6px' }}>+ Add image from media</button>
                  <button onClick={() => lstAdd('images', { src: '', alt: '', caption: '' })} style={{ ...lstAddBtn, borderStyle: 'solid', borderWidth: '1px', color: '#94a3b8' }}>+ Add empty slot (paste URL)</button>
                </PanelAccordion>
                <PanelAccordion title="Gallery Settings" icon={Sliders} defaultOpen={false}>
                  <label style={labelStyle}>Layout</label>
                  <select style={inputStyle} value={selectedBlock.content.layout || 'grid'} onChange={e => handleContentChange('layout', e.target.value)}>
                    <option value="grid">Grid (uniform crops)</option>
                    <option value="masonry">Masonry (natural ratios)</option>
                  </select>
                  <label style={{ ...labelStyle, marginTop: '10px' }}>Columns</label>
                  <select style={inputStyle} value={selectedBlock.content.columns || 3} onChange={e => handleContentChange('columns', parseInt(e.target.value, 10))}>
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <label style={{ ...labelStyle, marginTop: '10px' }}>Gap (px)</label>
                  <input type="number" min="0" max="80" style={inputStyle} value={selectedBlock.content.gap ?? 12} onChange={e => handleContentChange('gap', parseInt(e.target.value, 10) || 0)} />
                  {(selectedBlock.content.layout || 'grid') === 'grid' && (
                    <>
                      <label style={{ ...labelStyle, marginTop: '10px' }}>Thumbnail ratio</label>
                      <select style={inputStyle} value={selectedBlock.content.aspectRatio || '1 / 1'} onChange={e => handleContentChange('aspectRatio', e.target.value)}>
                        <option value="1 / 1">1:1 (Square)</option>
                        <option value="4 / 3">4:3</option>
                        <option value="3 / 2">3:2</option>
                        <option value="16 / 9">16:9</option>
                        <option value="2 / 3">2:3 (Portrait)</option>
                        <option value="auto">Auto (original ratio)</option>
                      </select>
                    </>
                  )}
                  <label style={{ ...labelStyle, marginTop: '10px' }}>Corner radius</label>
                  <input type="text" style={inputStyle} value={selectedBlock.content.borderRadius || '8px'} onChange={e => handleContentChange('borderRadius', e.target.value)} placeholder="8px" />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '12px' }}>
                    <input type="checkbox" checked={selectedBlock.content.lightbox !== false} onChange={e => handleContentChange('lightbox', e.target.checked)} /> Open images in a lightbox
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '8px' }}>
                    <input type="checkbox" checked={!!selectedBlock.content.showCaptions} onChange={e => handleContentChange('showCaptions', e.target.checked)} /> Show captions under images
                  </label>
                </PanelAccordion>
              </>
            )}

            {renderContentPanels()}

            {selectedBlock.type === 'BUTTON' && (
              <PanelAccordion title="Button Settings" icon={SquareChartGantt} defaultOpen={false}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '20px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedBlock.content.useGlobal ?? true} onChange={e => handleContentChange('useGlobal', e.target.checked)} /> Use Global Style (Brand)
                </label>
                <label style={labelStyle}>Button Size</label>
                <select style={inputStyle} onChange={e => {
                  if (e.target.value === 'sm') { handleStyleChange('padding', '8px 16px'); handleStyleChange('fontSize', '14px'); }
                  if (e.target.value === 'md') { handleStyleChange('padding', '12px 24px'); handleStyleChange('fontSize', '16px'); }
                  if (e.target.value === 'lg') { handleStyleChange('padding', '18px 36px'); handleStyleChange('fontSize', '20px'); }
                }}>
                  <option value="">Custom</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
                </select>
                <label style={labelStyle}>Text</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.text || 'Button'} onChange={e => handleContentChange('text', e.target.value)} />
                <label style={labelStyle}>Link</label>
                <select style={{...inputStyle, marginBottom: '8px'}} value={selectedBlock.content.url} onChange={e => handleContentChange('url', e.target.value)}>
                  <option value="#">Select internal page...</option>
                  {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>📄 {p.title}</option>)}
                </select>
                <input type="text" style={inputStyle} placeholder="Custom URL..." value={selectedBlock.content.url} onChange={e => handleContentChange('url', e.target.value)} />
              </PanelAccordion>
            )}

            {['TEXT', 'IMAGE_TEXT'].includes(selectedBlock.type) && (
              <PanelAccordion title="Text Content" icon={Layout} defaultOpen={false}>
                {selectedBlock.type === 'IMAGE_TEXT' && (
                  <>
                    <label style={labelStyle}>Image URL</label>
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                      <input type="text" style={{...inputStyle, flex: 1}} value={selectedBlock.content.src || ''} onChange={e => handleContentChange('src', e.target.value)} />
                      <button onClick={() => setMediaPickerTarget('src')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
                    </div>
                    <label style={labelStyle}>Layout</label>
                    <select style={inputStyle} value={selectedBlock.content.layout || 'img-left'} onChange={e => handleContentChange('layout', e.target.value)}>
                      <option value="img-left">Image Left</option><option value="img-right">Image Right</option>
                    </select>
                  </>
                )}
                <label style={labelStyle}>HTML Text</label>
                <div style={{ background: '#fff', borderRadius: '6px', color: '#0f172a' }}>
                  <JoditEditor value={selectedBlock.content.text || ''} config={editorConfig} onBlur={(val) => handleContentChange('text', val)} />
                </div>
              </PanelAccordion>
            )}

            {selectedBlock.type === 'IMAGE' && (
              <PanelAccordion title="Image Settings" icon={ImageIcon} defaultOpen={false}>
                <label style={labelStyle}>Image URL</label>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                  <input type="text" style={{...inputStyle, flex: 1}} value={selectedBlock.content.src || ''} onChange={e => handleContentChange('src', e.target.value)} />
                  <button onClick={() => setMediaPickerTarget('src')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
                </div>
                <label style={labelStyle}>Alt Text (SEO)</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.alt || ''} onChange={e => handleContentChange('alt', e.target.value)} />

                <label style={labelStyle}>Object-Fit Mode</label>
                <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.objectFit || 'cover'} onChange={e => handleContentChange('objectFit', e.target.value)}>
                  <option value="cover">Cover (Fill and crop)</option>
                  <option value="contain">Contain (Show full without crop)</option>
                  <option value="fill">Fill (Stretch to fit)</option>
                </select>

                <label style={labelStyle}>Aspect Ratio</label>
                <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.aspectRatio || 'auto'} onChange={e => handleContentChange('aspectRatio', e.target.value)}>
                  <option value="auto">Auto (original)</option>
                  <option value="1 / 1">1:1 (Square)</option>
                  <option value="4 / 3">4:3</option>
                  <option value="3 / 2">3:2</option>
                  <option value="16 / 9">16:9 (Wide)</option>
                  <option value="21 / 9">21:9 (Ultra-wide)</option>
                  <option value="2 / 3">2:3 (Portrait)</option>
                </select>

                <label style={labelStyle}>Focus / Object Position</label>
                <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.objectPosition || 'center'} onChange={e => handleContentChange('objectPosition', e.target.value)}>
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>

                <label style={labelStyle}>Zoom (Scale)</label>
                <input type="range" min="0.5" max="2" step="0.1" style={{width: '100%', cursor: 'pointer'}} value={selectedBlock.content.scale || 1} onChange={e => handleContentChange('scale', parseFloat(e.target.value))} />
              </PanelAccordion>
            )}

            {selectedBlock.type === 'VIDEO' && (
              <PanelAccordion title="Video Settings" icon={MonitorPlay} defaultOpen={false}>
                <label style={labelStyle}>YouTube / Vimeo Link</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.url || ''} onChange={e => handleContentChange('url', e.target.value)} />
              </PanelAccordion>
            )}

            {selectedBlock.type === 'HTML' && (
              <PanelAccordion title="Custom HTML" icon={Code} defaultOpen={false}>
                <label style={labelStyle}>HTML Code</label>
                <textarea rows="6" style={{...inputStyle, fontFamily: 'monospace'}} value={selectedBlock.content.code || ''} onChange={e => handleContentChange('code', e.target.value)} />
              </PanelAccordion>
            )}

            {selectedBlock.type === 'ICON_BOX' && (
              <PanelAccordion title="Icon Box Content" icon={Star} defaultOpen={false}>
                <label style={labelStyle}>Icon / Emoji</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.icon || ''} onChange={e => handleContentChange('icon', e.target.value)} />
                <label style={labelStyle}>Title</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.title || ''} onChange={e => handleContentChange('title', e.target.value)} />
                <label style={labelStyle}>Description</label>
                <textarea rows="3" style={inputStyle} value={selectedBlock.content.description || ''} onChange={e => handleContentChange('description', e.target.value)} />
              </PanelAccordion>
            )}

            {selectedBlock.type === 'TESTIMONIAL' && (
              <PanelAccordion title="Testimonial" icon={MessageSquareQuote} defaultOpen={false}>
                <label style={labelStyle}>Quote</label>
                <textarea rows="3" style={inputStyle} value={selectedBlock.content.quote || ''} onChange={e => handleContentChange('quote', e.target.value)} />
                <label style={labelStyle}>Author</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.author || ''} onChange={e => handleContentChange('author', e.target.value)} />
                <label style={labelStyle}>Role</label>
                <input type="text" style={inputStyle} value={selectedBlock.content.role || ''} onChange={e => handleContentChange('role', e.target.value)} />
              </PanelAccordion>
            )}

          </div>
        )}

        {/* --- STYLE TAB --- */}
        {activeTab === 'style' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>

            <PanelAccordion title="Size & Dimensions" icon={Layout} defaultOpen={false}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={labelStyle}>Width</label>
                  <input type="text" style={inputStyle} value={selectedBlock.styles.width || ''} onChange={e => handleStyleChange('width', e.target.value)} placeholder="e.g. 100%, 500px" />
                </div>
                <div>
                  <label style={labelStyle}>Height</label>
                  <input type="text" style={inputStyle} value={selectedBlock.styles.height || ''} onChange={e => handleStyleChange('height', e.target.value)} placeholder="e.g. auto, 50vh" />
                </div>
                <div>
                  <label style={labelStyle}>Max Width</label>
                  <input type="text" style={inputStyle} value={selectedBlock.styles.maxWidth || ''} onChange={e => handleStyleChange('maxWidth', e.target.value)} placeholder="e.g. 1200px" />
                </div>
                <div>
                  <label style={labelStyle}>Min Height</label>
                  <input type="text" style={inputStyle} value={selectedBlock.styles.minHeight || ''} onChange={e => handleStyleChange('minHeight', e.target.value)} placeholder="e.g. 300px" />
                </div>
              </div>
              <label style={labelStyle}>Block Alignment (Centering)</label>
              <div style={{ display: 'flex', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
                <button onClick={() => handleStyleChange('margin', '0 auto 0 0')} style={{ flex: 1, padding: '8px', background: selectedBlock.styles.margin === '0 auto 0 0' ? '#334155' : 'transparent', border: 'none', cursor: 'pointer', color: '#f8fafc' }}><AlignLeft size={14}/></button>
                <button onClick={() => handleStyleChange('margin', '0 auto')} style={{ flex: 1, padding: '8px', background: selectedBlock.styles.margin === '0 auto' ? '#334155' : 'transparent', border: 'none', cursor: 'pointer', color: '#f8fafc' }}><AlignCenter size={14}/></button>
                <button onClick={() => handleStyleChange('margin', '0 0 0 auto')} style={{ flex: 1, padding: '8px', background: selectedBlock.styles.margin === '0 0 0 auto' ? '#334155' : 'transparent', border: 'none', cursor: 'pointer', color: '#f8fafc' }}><AlignRight size={14}/></button>
              </div>
            </PanelAccordion>

            <PanelAccordion title="Typography" icon={Type} defaultOpen={false}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Font Size (↑/↓)</label>
                  <input type="text" value={selectedBlock.styles.fontSize || ''} onChange={e => handleStyleChange('fontSize', e.target.value)} onKeyDown={e => handleNumericKey(e, selectedBlock.styles.fontSize, val => handleStyleChange('fontSize', val))} style={inputStyle} placeholder="e.g. 16px" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Line Height (↑/↓)</label>
                  <input type="text" value={selectedBlock.styles.lineHeight || ''} onChange={e => handleStyleChange('lineHeight', e.target.value)} onKeyDown={e => handleNumericKey(e, selectedBlock.styles.lineHeight, val => handleStyleChange('lineHeight', val))} style={inputStyle} placeholder="e.g. 1.5" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Font Weight</label>
                  <select style={{...inputStyle, marginBottom:0}} value={selectedBlock.styles.fontWeight || ''} onChange={e => handleStyleChange('fontWeight', e.target.value)}>
                    <option value="">Default</option>
                    <option value="300">Light (300)</option>
                    <option value="400">Normal (400)</option>
                    <option value="600">Semi Bold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="900">Black (900)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Text Transform</label>
                  <select style={{...inputStyle, marginBottom:0}} value={selectedBlock.styles.textTransform || ''} onChange={e => handleStyleChange('textTransform', e.target.value)}>
                    <option value="">Default</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="lowercase">lowercase</option>
                    <option value="capitalize">Capitalize</option>
                  </select>
                </div>
              </div>
              <label style={{ fontSize: '10px', color: '#94a3b8' }}>Letter Spacing (↑/↓)</label>
              <input type="text" value={selectedBlock.styles.letterSpacing || ''} onChange={e => handleStyleChange('letterSpacing', e.target.value)} onKeyDown={e => handleNumericKey(e, selectedBlock.styles.letterSpacing, val => handleStyleChange('letterSpacing', val))} style={{...inputStyle, marginBottom:0}} placeholder="e.g. 1px" />
            </PanelAccordion>

            <PanelAccordion title="Background & Alignment" icon={Palette} defaultOpen={false}>
              <label style={labelStyle}>Background Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <input type="color" value={selectedBlock.styles.backgroundColor || '#ffffff'} onChange={e => handleStyleChange('backgroundColor', e.target.value)} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }} />
                <button onClick={() => handleStyleChange('backgroundColor', 'transparent')} style={{ padding: '8px', fontSize: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', color: '#f8fafc' }}>Transparent</button>
              </div>
              <label style={labelStyle}>Text Alignment</label>
              <div style={{ display: 'flex', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
                {['left', 'center', 'right'].map(align => (
                  <button key={align} onClick={() => handleStyleChange('textAlign', align)} style={{ flex: 1, padding: '8px', background: selectedBlock.styles.textAlign === align ? '#334155' : 'transparent', border: 'none', cursor: 'pointer', color: '#f8fafc' }}>
                    {align === 'left' ? <AlignLeft size={14}/> : align === 'center' ? <AlignCenter size={14}/> : <AlignRight size={14}/>}
                  </button>
                ))}
              </div>
            </PanelAccordion>

            <PanelAccordion title="Borders & Shadows" icon={BoxSelect} defaultOpen={false}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Thickness (↑/↓)</label>
                  <input type="text" value={selectedBlock.styles.borderWidth || '0px'} onChange={e => handleStyleChange('borderWidth', e.target.value)} onKeyDown={e => handleNumericKey(e, selectedBlock.styles.borderWidth, val => handleStyleChange('borderWidth', val))} style={inputStyle} placeholder="e.g. 2px" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>Style</label>
                  <select style={inputStyle} value={selectedBlock.styles.borderStyle || 'solid'} onChange={e => handleStyleChange('borderStyle', e.target.value)}>
                    <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
                  </select>
                </div>
              </div>
              <label style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Color</label>
              <input type="color" value={selectedBlock.styles.borderColor || '#000000'} onChange={e => handleStyleChange('borderColor', e.target.value)} style={{ width: '100%', height: '30px', border: 'none', borderRadius: '4px', marginBottom: '15px', cursor: 'pointer' }} />
              <label style={labelStyle}>Border Radius (↑/↓ to adjust)</label>
              <input type="text" placeholder="e.g. 10px, 50%" value={selectedBlock.styles.borderRadius || '0px'} onChange={e => handleStyleChange('borderRadius', e.target.value)} onKeyDown={e => handleNumericKey(e, selectedBlock.styles.borderRadius, val => handleStyleChange('borderRadius', val))} style={inputStyle} />
            </PanelAccordion>
          </div>
        )}

        {/* --- ADVANCED TAB --- */}
        {activeTab === 'advanced' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>

{userRole === 'admin' && (
            <PanelAccordion title="Custom Code" icon={Code} defaultOpen={false}>
              <label style={labelStyle}>CSS ID (Unique)</label>
              <input type="text" value={selectedBlock.content.customId || ''} onChange={e => handleContentChange('customId', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} style={inputStyle} placeholder="e.g. my-hero-section" />

              <label style={labelStyle}>CSS Classes (Space separated)</label>
              <input type="text" value={selectedBlock.content.customClass || ''} onChange={e => handleContentChange('customClass', e.target.value)} style={inputStyle} placeholder="e.g. shadow-lg text-center" />

              <label style={labelStyle}>Custom CSS</label>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#94a3b8' }}>Use <strong style={{color:'#38bdf8'}}>__THIS__</strong> to target this specific element.</p>
              <textarea rows="6" value={selectedBlock.content.customCss || ''} onChange={e => handleContentChange('customCss', e.target.value)} style={{...inputStyle, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre', color: '#a78bfa'}} placeholder="__THIS__ {\n  filter: blur(5px);\n  transform: rotate(2deg);\n}" />
            </PanelAccordion>
            )}

            <PanelAccordion title="Spacing (Margin & Padding)" icon={Layout} defaultOpen={false}>
              <SpacingControl label="MARGIN (Outer Space)" value={selectedBlock.styles.margin} onChange={val => handleStyleChange('margin', val)} />
              <SpacingControl label="PADDING (Inner Space)" value={selectedBlock.styles.padding} onChange={val => handleStyleChange('padding', val)} />
            </PanelAccordion>

            <PanelAccordion title="Effects & Animations" icon={MoveUp} defaultOpen={false}>
              <label style={labelStyle}>Scroll Animation</label>
              <select style={{...inputStyle, borderColor: '#38bdf8', marginBottom: 0}} value={selectedBlock.styles.animation || 'none'} onChange={e => handleStyleChange('animation', e.target.value)}>
                <option value="none">None</option><option value="fade-up">Fade Up</option><option value="fade-in">Fade In</option><option value="zoom-in">Zoom In</option>
              </select>
            </PanelAccordion>
          </div>
        )}

      </div>
    </div>
  );
}
