import React, { useState } from 'react';
import { Sliders, MapPinned, Image as ImageIcon } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ChkF, ColorF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Click-to-place area: the image (or a grey box) with numbered dots; a click moves the selected pin there.
function PinPlacer({ image, ratio, pins, selected, onSelect, onPlace }) {
  const place = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height || selected == null) return;
    const pct = (v, max) => Math.round(Math.min(100, Math.max(0, (v / max) * 100)) * 10) / 10;
    onPlace(selected, pct(e.clientX - r.left, r.width), pct(e.clientY - r.top, r.height));
  };
  return (
    <div style={{ marginBottom: 10 }}>
      <div role="group" aria-label="Pin placement area: click to move the selected pin" onClick={place}
        style={{ position: 'relative', cursor: selected == null ? 'default' : 'crosshair', borderRadius: 8, overflow: 'hidden', background: '#e2e8f0', aspectRatio: image ? undefined : ratio, border: '1px solid #334155' }}>
        {image && <img src={image} alt="" draggable={false} style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} />}
        {pins.map((p, i) => (
          <button key={i} type="button" aria-label={`Select pin ${i + 1}`} aria-pressed={selected === i}
            onClick={(e) => { e.stopPropagation(); onSelect(i); }}
            style={{ position: 'absolute', left: `${Number(p.x) || 0}%`, top: `${Number(p.y) || 0}%`, transform: 'translate(-50%, -50%)', width: 22, height: 22, borderRadius: '50%', padding: 0, cursor: 'pointer', font: '700 11px/1 system-ui', color: '#fff', background: selected === i ? '#f59e0b' : '#3b82f6', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.4)' }}>{i + 1}</button>
        ))}
      </div>
      <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>{selected == null ? 'Select a pin, then click on the image to place it.' : `Pin ${selected + 1} selected: click on the image to move it.`}</p>
    </div>
  );
}

// Content panel: HOTSPOTS
export default function HotspotsPanel({ ctx }) {
  const { c, set, pickTo, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const pins = lstOf('pins');
  const [selected, setSelected] = useState(pins.length ? 0 : null);
  const sel = selected != null && selected < pins.length ? selected : null;
  return (
    <>
      <PanelAccordion title="Hotspot Image" icon={ImageIcon} defaultOpen={true}>
        <ImgF label="Image" value={c.image} onChange={v => set('image', v)} onPick={pickTo({ key: 'image', alt: 'alt' })} />
        <TxtF label="Image alt text" value={c.alt} onChange={v => set('alt', v)} />
        {!c.image && <SelF label="Empty image shape" value={c.ratio || '16 / 9'} onChange={v => set('ratio', v)} options={[['16 / 9', '16:9'], ['4 / 3', '4:3'], ['3 / 2', '3:2'], ['1 / 1', '1:1'], ['21 / 9', '21:9']]} />}
      </PanelAccordion>
      <PanelAccordion title="Hotspot Pins" icon={MapPinned} defaultOpen={true}>
        <PinPlacer image={c.image} ratio={c.ratio || '16 / 9'} pins={pins} selected={sel} onSelect={setSelected}
          onPlace={(i, x, y) => lstPatch('pins', i, { x, y })} />
        {pins.map((p, i) => (
          <ItemCard key={i} title={p.title || `Pin ${i + 1}`} index={i} total={pins.length} onMove={(d) => { lstMove('pins', i, d); setSelected(Math.min(pins.length - 1, Math.max(0, i + d))); }} onRemove={() => { lstRemove('pins', i); setSelected(null); }}>
            <TxtF label="Title" value={p.title} onChange={v => lstPatch('pins', i, { title: v })} />
            <TxtF label="Text" value={p.text} onChange={v => lstPatch('pins', i, { text: v })} multiline rows={2} />
            <TxtF label="Link text (empty = no link)" value={p.linkText} onChange={v => lstPatch('pins', i, { linkText: v })} />
            <TxtF label="Link" value={p.href} onChange={v => lstPatch('pins', i, { href: v })} placeholder="/page or https://…" />
            <NumF label="Position from the left (%)" value={p.x ?? 50} onChange={v => lstPatch('pins', i, { x: v })} min={0} max={100} step={0.5} />
            <NumF label="Position from the top (%)" value={p.y ?? 50} onChange={v => lstPatch('pins', i, { y: v })} min={0} max={100} step={0.5} />
            <button onClick={() => setSelected(i)} style={{ ...lstAddBtn, marginTop: 6, borderStyle: 'solid', borderWidth: '1px', color: '#94a3b8' }}>Place this pin on the image</button>
          </ItemCard>
        ))}
        {pins.length < 20 && <button onClick={() => { lstAdd('pins', { x: 50, y: 50, title: 'New pin', text: '', linkText: '', href: '' }); setSelected(pins.length); }} style={lstAddBtn}>+ Add pin</button>}
      </PanelAccordion>
      <PanelAccordion title="Hotspot Style" icon={Sliders} defaultOpen={false}>
        <ColorF label="Pin color" value={c.pinColor} onChange={v => set('pinColor', v)} />
        <ColorF label="Pin number color" value={c.pinTextColor} onChange={v => set('pinTextColor', v)} />
        <ChkF label="Pulsing ring (off for visitors who prefer reduced motion)" checked={c.pulse !== false} onChange={v => set('pulse', v)} />
        <NumF label="Corner radius px" value={c.radius ?? 12} onChange={v => set('radius', v)} min={0} max={40} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The text opens on hover, keyboard focus, or a tap or click.</p>
      </PanelAccordion>
    </>
  );
}
