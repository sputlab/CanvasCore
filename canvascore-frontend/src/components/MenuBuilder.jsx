import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDraftSync } from '../session/hooks';
import { useStore } from '../store/useStore';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft, Save, Trash2, ListTree, Palette, Smartphone, LayoutPanelTop,
  ArrowUp, ArrowDown, IndentIncrease, IndentDecrease, Plus, GripVertical, Image as ImageIcon, Sparkles, Upload
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  align: 'flex-end', styleType: 'link', textColor: '#334155', hoverTextColor: '#3b82f6',
  hoverBgColor: 'transparent', bgColor: '#3b82f6', borderRadius: '6px', itemGap: '20px',
  itemBorder: 'none', menuBgColor: 'transparent', menuBgOpacity: 100, barHeight: '64px',
  barPadding: '0 24px', isSticky: false, shadow: 'none', effect: 'none',
  logoUrl: '', logoAlign: 'left', logoHeight: '40px', logoGap: '24px', logoLink: 'index.html',
  mobileThreshold: '768', burgerIcon: '☰',
};

// ---- utilità sull'albero (immutabili) ----
const clone = (t) => JSON.parse(JSON.stringify(t));
const newNode = () => ({ id: 'm_' + Date.now() + Math.floor(Math.random() * 1000), title: 'New Link', url: '', children: [] });

function locate(list, id, parent = null) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { list, index: i, parent };
    const r = locate(list[i].children || [], id, list[i]);
    if (r) return r;
  }
  return null;
}

export default function MenuBuilder() {
  const { setView, pages, publishSiteAsync } = useStore();
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  // Backup locale del lavoro non salvato (vedi src/session/)
  const draftValue = useMemo(() => ({ items, settings }), [items, settings]);
  const draft = useDraftSync('menu', draftValue);
  const [restoredAt, setRestoredAt] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const logoInputRef = useRef(null);

  // Frecce su/giù per regolare il radius numerico
  const radiusKey = (e) => {
    const m = String(settings.borderRadius || '').match(/^(\d+)(px|rem|em|%)?$/);
    if (!m) return;
    let n = parseInt(m[1], 10); const unit = m[2] || 'px';
    if (e.key === 'ArrowUp') { e.preventDefault(); n += 1; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); n = Math.max(0, n - 1); }
    else return;
    setSettings({ ...settings, borderRadius: n + unit });
  };

  // Upload del logo nel media manager; usa l'URL restituito
  const uploadLogo = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch('api.php?action=upload_media', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success && data.url) setSettings(s => ({ ...s, logoUrl: data.url }));
      else alert(data.message || 'Upload failed.');
    } catch (e) { alert('Upload error.'); }
  };

  // Preset dei bordi voce
  const BORDER_PRESETS = [
    { label: 'None', value: 'none' },
    { label: 'Thin solid', value: '1px solid #e2e8f0' },
    { label: 'Solid', value: '2px solid #cbd5e1' },
    { label: 'Dashed', value: '1px dashed #cbd5e1' },
    { label: 'Dotted', value: '2px dotted #cbd5e1' },
  ];
  const isCustomBorder = !BORDER_PRESETS.some(b => b.value === (settings.itemBorder || 'none'));

  useEffect(() => {
    fetch('api.php?action=get_menu')
      .then(res => res.json())
      .then(data => {
        let loaded = []; let loadedSettings = DEFAULT_SETTINGS;
        if (data && !Array.isArray(data)) { loaded = data.items || []; loadedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }; }
        else if (Array.isArray(data)) loaded = data;
        const server = { items: flatToTree(loaded), settings: loadedSettings };
        // Se esiste una bozza locale non salvata (sessione scaduta, refresh...) la si riapplica
        const pending = draft.loaded(server);
        const v = pending ? pending.value : server;
        setSettings(v.settings); setItems(v.items);
        if (pending) setRestoredAt(pending.savedAt);
      })
      .catch(console.error);
  }, []);

  // retrocompat: converte eventuale formato piatto (parentId) in albero
  function flatToTree(list) {
    if (!list.length) return [];
    const nested = list.some(it => Object.prototype.hasOwnProperty.call(it, 'children'));
    if (nested) return list.map(it => ({ ...it, url: it.url === '#' ? '' : (it.url || ''), children: flatToTree(it.children || []) }));
    const map = {}; list.forEach(it => map[it.id] = { ...it, url: it.url === '#' ? '' : (it.url || ''), children: [] });
    const roots = [];
    list.forEach(it => { const n = map[it.id]; if (it.parentId && map[it.parentId]) map[it.parentId].children.push(n); else roots.push(n); });
    return roots;
  }

  const saveMenu = async () => {
    setIsSaving(true);
    try {
      const r = await fetch('api.php?action=save_menu', { method: 'POST', body: JSON.stringify({ items, settings }) });
      const saved = await r.json();
      if (!saved || !saved.success) {
        alert('Menu NOT saved: ' + ((saved && saved.message) || 'unexpected response') + '\nYour changes are still here and backed up on this device.');
        setIsSaving(false);
        return;
      }
      draft.saved({ items, settings });
      setRestoredAt(null);
      const res = await publishSiteAsync();
      alert(res && res.success ? '✅ Menu saved and site updated!' : 'Menu saved, but auto-publish had an issue.');
    } catch (e) { alert('Error saving menu. Your changes are still here and backed up on this device.'); }
    setIsSaving(false);
  };

  // ---- operazioni ----
  const addTop = () => setItems([...items, newNode()]);
  const addChild = (id) => { const t = clone(items); const l = locate(t, id); if (l) l.list[l.index].children.push(newNode()); setItems(t); };
  const removeItem = (id) => { const t = clone(items); const l = locate(t, id); if (l) l.list.splice(l.index, 1); setItems(t); };
  const updateItem = (id, field, value) => { const t = clone(items); const l = locate(t, id); if (l) l.list[l.index][field] = value; setItems(t); };

  const moveUpDown = (id, dir) => {
    const t = clone(items); const l = locate(t, id); if (!l) return;
    const j = dir === 'up' ? l.index - 1 : l.index + 1;
    if (j < 0 || j >= l.list.length) return;
    [l.list[l.index], l.list[j]] = [l.list[j], l.list[l.index]];
    setItems(t);
  };

  // indent: diventa figlio del fratello precedente
  const indent = (id) => {
    const t = clone(items); const l = locate(t, id); if (!l || l.index === 0) return;
    const prev = l.list[l.index - 1];
    const [node] = l.list.splice(l.index, 1);
    prev.children = prev.children || []; prev.children.push(node);
    setItems(t);
  };

  // outdent: risale al livello del genitore, subito dopo di esso
  const outdent = (id) => {
    const t = clone(items); const l = locate(t, id); if (!l || !l.parent) return;
    const [node] = l.list.splice(l.index, 1);
    const pl = locate(t, l.parent.id);
    pl.list.splice(pl.index + 1, 0, node);
    setItems(t);
  };

  // drag&drop: riordina tra fratelli dello stesso livello
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const t = clone(items);
    const a = locate(t, active.id); const o = locate(t, over.id);
    if (!a || !o) return;
    if (a.list === o.list || a.parent?.id === o.parent?.id) {
      // stessi fratelli: riordina
      const reordered = arrayMove(a.list, a.index, o.index);
      a.list.length = 0; a.list.push(...reordered);
      setItems(t);
    }
  };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <button onClick={() => setView('manager')} style={backBtn}><ChevronLeft size={16} /> Back to Dashboard</button>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><ListTree size={24} color="#38bdf8" /> Menu Builder</h2>
        </div>
        <button onClick={saveMenu} disabled={isSaving} style={primaryBtn}><Save size={18} /> {isSaving ? 'Saving...' : 'Save & Publish'}</button>
      </div>

      {restoredAt && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#0c4a6e', border: '1px solid #0369a1', borderRadius: '10px', padding: '9px 13px', marginBottom: '14px', fontSize: '13px', color: '#e0f2fe' }}>
          <span><strong>Restored unsaved changes</strong> from {new Date(restoredAt).toLocaleString()}. They are <strong>not saved to the site yet</strong>: click Save &amp; Publish to keep them.</span>
          <button onClick={() => {
            if (!window.confirm('Discard the restored changes and reload the saved menu?')) return;
            const srv = draft.discard(); setItems(srv.items); setSettings(srv.settings); setRestoredAt(null);
          }} style={{ background: 'transparent', color: '#bae6fd', border: '1px solid #0369a1', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>Discard</button>
        </div>
      )}

      <LivePreview items={items} settings={settings} />

      {/* ---- Impostazioni ---- */}
      <div style={card}>
        <SectionTitle icon={Palette} color="#38bdf8">Items & Colors</SectionTitle>
        <Grid cols={3}>
          <Field label="ITEM STYLE"><select style={input} value={settings.styleType} onChange={e => setSettings({ ...settings, styleType: e.target.value })}>
            <option value="link">Classic Link</option><option value="pill">Pill (Rounded)</option><option value="box">Box</option></select></Field>
          <Field label="BUTTONS ALIGNMENT"><select style={input} value={settings.align} onChange={e => setSettings({ ...settings, align: e.target.value })}>
            <option value="flex-start">Left</option><option value="center">Center</option><option value="flex-end">Right</option></select></Field>
          <Field label="SPACING BETWEEN ITEMS"><input style={input} value={settings.itemGap} onChange={e => setSettings({ ...settings, itemGap: e.target.value })} placeholder="20px" /></Field>
          <Field label="TEXT COLOR"><ColorInput value={settings.textColor} onChange={v => setSettings({ ...settings, textColor: v })} /></Field>
          <Field label="HOVER TEXT COLOR"><ColorInput value={settings.hoverTextColor} onChange={v => setSettings({ ...settings, hoverTextColor: v })} /></Field>
          <Field label="HOVER BACKGROUND"><ColorInput value={settings.hoverBgColor} onChange={v => setSettings({ ...settings, hoverBgColor: v })} allowTransparent /></Field>
          {settings.styleType !== 'link' && <Field label="BUTTON BACKGROUND"><ColorInput value={settings.bgColor} onChange={v => setSettings({ ...settings, bgColor: v })} /></Field>}
          <Field label="ITEM BORDER">
            <select style={input} value={isCustomBorder ? '__custom__' : (settings.itemBorder || 'none')} onChange={e => { if (e.target.value !== '__custom__') setSettings({ ...settings, itemBorder: e.target.value }); else setSettings({ ...settings, itemBorder: '1px solid #cccccc' }); }}>
              {BORDER_PRESETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              <option value="__custom__">Custom…</option>
            </select>
            {isCustomBorder && <input style={{ ...input, marginTop: '6px' }} value={settings.itemBorder} onChange={e => setSettings({ ...settings, itemBorder: e.target.value })} placeholder="1px solid #ccc" />}
          </Field>
          <Field label="ITEM RADIUS (↑/↓)"><input style={input} value={settings.borderRadius} onChange={e => setSettings({ ...settings, borderRadius: e.target.value })} onKeyDown={radiusKey} placeholder="6px" /></Field>
        </Grid>

        <SectionTitle icon={LayoutPanelTop} color="#a78bfa" border>Bar & Background</SectionTitle>
        <Grid cols={3}>
          <Field label="BAR HEIGHT"><input style={input} value={settings.barHeight} onChange={e => setSettings({ ...settings, barHeight: e.target.value })} placeholder="64px" /></Field>
          <Field label="BAR PADDING"><input style={input} value={settings.barPadding} onChange={e => setSettings({ ...settings, barPadding: e.target.value })} placeholder="0 24px" /></Field>
          <Field label="BACKGROUND COLOR"><ColorInput value={settings.menuBgColor} onChange={v => setSettings({ ...settings, menuBgColor: v })} allowTransparent /></Field>
          <Field label={`BACKGROUND OPACITY (${settings.menuBgOpacity}%)`}>
            <input type="range" min="0" max="100" value={settings.menuBgOpacity} onChange={e => setSettings({ ...settings, menuBgOpacity: parseInt(e.target.value) })} style={{ width: '100%' }} /></Field>
          <Field label="SHADOW"><select style={input} value={settings.shadow} onChange={e => setSettings({ ...settings, shadow: e.target.value })}>
            <option value="none">None</option><option value="soft">Soft</option><option value="medium">Medium</option><option value="strong">Strong</option></select></Field>
          <Field label="STICKY"><label style={checkRow}><input type="checkbox" checked={settings.isSticky} onChange={e => setSettings({ ...settings, isSticky: e.target.checked })} style={{ width: 18, height: 18 }} /> Fixed on top</label></Field>
        </Grid>

        <SectionTitle icon={Sparkles} color="#fbbf24" border>Premium Effects</SectionTitle>
        <Grid cols={3}>
          <Field label="HOVER EFFECT"><select style={input} value={settings.effect} onChange={e => setSettings({ ...settings, effect: e.target.value })}>
            <option value="none">None</option>
            <option value="underline">Animated underline</option>
            <option value="lift">Lift on hover</option>
            <option value="glass">Glassmorphism (blur)</option>
            <option value="glare">Glare (animated sheen)</option>
          </select></Field>
        </Grid>

        <SectionTitle icon={ImageIcon} color="#10b981" border>Logo</SectionTitle>
        <Grid cols={3}>
          <Field label="LOGO IMAGE">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{ ...input, flex: 1 }} value={settings.logoUrl} onChange={e => setSettings({ ...settings, logoUrl: e.target.value })} placeholder="/uploads/logo.png" />
              <button onClick={() => logoInputRef.current && logoInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}><Upload size={14} /> Upload</button>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { uploadLogo(e.target.files[0]); e.target.value = ''; }} />
            </div>
          </Field>
          <Field label="LOGO ALIGNMENT"><select style={input} value={settings.logoAlign} onChange={e => setSettings({ ...settings, logoAlign: e.target.value })}>
            <option value="left">Left</option><option value="right">Right</option></select></Field>
          <Field label="LOGO HEIGHT"><input style={input} value={settings.logoHeight} onChange={e => setSettings({ ...settings, logoHeight: e.target.value })} placeholder="40px" /></Field>
          <Field label="LOGO / BUTTONS GAP"><input style={input} value={settings.logoGap} onChange={e => setSettings({ ...settings, logoGap: e.target.value })} placeholder="24px" /></Field>
          <Field label="LOGO LINK"><select style={input} value={settings.logoLink} onChange={e => setSettings({ ...settings, logoLink: e.target.value })}>
            <option value="index.html">Homepage</option><option value="">No link</option>
            {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>{p.title}</option>)}</select></Field>
        </Grid>

        <SectionTitle icon={Smartphone} color="#10b981" border>Mobile (Hamburger)</SectionTitle>
        <Grid cols={2}>
          <Field label="MOBILE BREAKPOINT (px)"><input type="number" style={input} value={settings.mobileThreshold} onChange={e => setSettings({ ...settings, mobileThreshold: e.target.value })} /></Field>
          <Field label="BURGER ICON"><input style={input} value={settings.burgerIcon} onChange={e => setSettings({ ...settings, burgerIcon: e.target.value })} /></Field>
        </Grid>
      </div>

      {/* ---- Struttura menu ---- */}
      <div style={card}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Navigation Structure</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
          Drag <GripVertical size={12} style={{ verticalAlign: 'middle' }} /> to reorder. Use ⇥ / ⇤ to nest or un-nest a submenu item.
          Leave the URL empty for a parent that only opens its submenu (no link).
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <MenuLevel items={items} depth={0} pages={pages}
            onUpdate={updateItem} onRemove={removeItem} onAddChild={addChild}
            onMove={moveUpDown} onIndent={indent} onOutdent={outdent} />
        </DndContext>
        <button onClick={addTop} style={addBtn}><Plus size={16} /> Add top-level item</button>
      </div>
    </div>
  );
}

function MenuLevel({ items, depth, pages, onUpdate, onRemove, onAddChild, onMove, onIndent, onOutdent }) {
  return (
    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
      {items.map((item, idx) => (
        <MenuRow key={item.id} item={item} index={idx} total={items.length} depth={depth} pages={pages}
          onUpdate={onUpdate} onRemove={onRemove} onAddChild={onAddChild} onMove={onMove} onIndent={onIndent} onOutdent={onOutdent} />
      ))}
    </SortableContext>
  );
}

function MenuRow({ item, index, total, depth, pages, onUpdate, onRemove, onAddChild, onMove, onIndent, onOutdent }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const noLink = !item.url || item.url === '#';
  return (
    <div ref={setNodeRef} style={{ ...style, marginLeft: depth * 28 }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: depth ? '#111c30' : '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', borderLeft: depth ? '3px solid #38bdf8' : '1px solid #334155', marginBottom: '8px' }}>
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#64748b', display: 'flex' }} title="Drag to reorder"><GripVertical size={16} /></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <button onClick={() => onMove(item.id, 'up')} disabled={index === 0} style={miniBtn}><ArrowUp size={12} /></button>
          <button onClick={() => onMove(item.id, 'down')} disabled={index === total - 1} style={miniBtn}><ArrowDown size={12} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <button onClick={() => onIndent(item.id)} disabled={index === 0} style={{ ...miniBtn, background: '#1e3a5f' }} title="Nest under previous"><IndentIncrease size={12} /></button>
          <button onClick={() => onOutdent(item.id)} disabled={depth === 0} style={{ ...miniBtn, background: '#1e3a5f' }} title="Un-nest"><IndentDecrease size={12} /></button>
        </div>
        <input style={{ ...input, flex: 1 }} value={item.title} onChange={e => onUpdate(item.id, 'title', e.target.value)} placeholder="Label" />
        <select style={{ ...input, flex: 1, cursor: 'pointer' }} value={pages.some(p => (p.clean_slug ? p.clean_slug + '/index.html' : 'index.html') === item.url) ? item.url : (noLink ? '' : '__custom__')} onChange={e => { if (e.target.value !== '__custom__') onUpdate(item.id, 'url', e.target.value); }}>
          <option value="">— No link (opens submenu) —</option>
          <option value="__custom__">Custom URL…</option>
          {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>{p.title}</option>)}
        </select>
        <input style={{ ...input, flex: 1 }} value={item.url} onChange={e => onUpdate(item.id, 'url', e.target.value)} placeholder="empty = no link" />
        <button onClick={() => onAddChild(item.id)} style={{ ...miniBtn, background: '#065f46', padding: '8px' }} title="Add submenu item"><Plus size={14} /></button>
        <button onClick={() => onRemove(item.id)} style={{ padding: '8px', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} /></button>
      </div>
      {item.children && item.children.length > 0 && (
        <MenuLevel items={item.children} depth={depth + 1} pages={pages}
          onUpdate={onUpdate} onRemove={onRemove} onAddChild={onAddChild} onMove={onMove} onIndent={onIndent} onOutdent={onOutdent} />
      )}
    </div>
  );
}

// Anteprima AUTENTICA: usa il vero compiler (endpoint preview_menu) in un iframe isolato.
function LivePreview({ items, settings }) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('api.php?action=preview_menu', { method: 'POST', body: JSON.stringify({ items, settings }) });
        const data = await res.json();
        if (data && data.success) setHtml(data.html || '');
      } catch (e) { /* noop */ }
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [items, settings]);

  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>:root{--brand-color:#3b82f6}html,body{margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}</style>
    </head><body>${html}<div style="height:220px"></div></body></html>`;

  return (
    <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
      <div style={{ fontSize: '10px', color: '#64748b', padding: '6px 12px', background: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Live preview (authentic — links are inert)</span>{loading && <span>updating…</span>}
      </div>
      <iframe title="menu-preview" srcDoc={doc} sandbox="allow-scripts"
        style={{ width: '100%', height: '340px', border: 'none', background: '#f1f5f9', display: 'block' }} />
    </div>
  );
}


// ---- piccoli componenti UI ----
const SectionTitle = ({ icon: Icon, color, border, children }) => (
  <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', ...(border ? { borderTop: '1px solid #334155', paddingTop: '20px', marginTop: '20px' } : {}) }}>
    <Icon size={16} color={color} /> {children}
  </h3>
);
const Grid = ({ cols, children }) => <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '15px' }}>{children}</div>;
const Field = ({ label, children }) => (
  <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 750, color: '#94a3b8', marginBottom: '5px' }}>{label}</label>{children}</div>
);
const ColorInput = ({ value, onChange, allowTransparent }) => (
  <div style={{ display: 'flex', gap: '8px' }}>
    <input type="color" value={value === 'transparent' || !value ? '#ffffff' : value} onChange={e => onChange(e.target.value)} style={{ width: 38, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
    {allowTransparent && <button onClick={() => onChange('transparent')} style={{ padding: '6px 10px', fontSize: 11, background: value === 'transparent' ? '#38bdf8' : '#334155', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>None</button>}
  </div>
);

const card = { background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '25px', marginBottom: '20px' };
const input = { padding: '7px 9px', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', width: '100%', background: '#0f172a', color: '#fff', boxSizing: 'border-box' };
const miniBtn = { background: '#334155', border: 'none', color: '#fff', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex' };
const backBtn = { background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0, marginBottom: '10px' };
const primaryBtn = { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' };
const addBtn = { width: '100%', padding: '15px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' };
const checkRow = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#f8fafc', fontWeight: 'bold', height: '38px', cursor: 'pointer' };
