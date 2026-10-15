import React from 'react';
import { Sliders, LayoutDashboard } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ColorF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: BENTO
export default function BentoPanel({ ctx }) {
  const { c, set, pickTo, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const tiles = lstOf('tiles');
  return (
    <>
      <PanelAccordion title="Bento Tiles" icon={LayoutDashboard} defaultOpen={true}>
        {tiles.map((t, i) => (
          <ItemCard key={i} title={t.title || `Tile ${i + 1}`} index={i} total={tiles.length} onMove={(d) => lstMove('tiles', i, d)} onRemove={() => lstRemove('tiles', i)}>
            <SelF label="Size" value={t.size || 'normal'} onChange={v => lstPatch('tiles', i, { size: v })} options={[['normal', 'Normal (1×1)'], ['wide', 'Wide (2×1)'], ['tall', 'Tall (1×2)'], ['large', 'Large (2×2)']]} />
            <TxtF label="Icon (emoji)" value={t.icon} onChange={v => lstPatch('tiles', i, { icon: v })} />
            <TxtF label="Title" value={t.title} onChange={v => lstPatch('tiles', i, { title: v })} />
            <TxtF label="Text" value={t.text} onChange={v => lstPatch('tiles', i, { text: v })} multiline rows={2} />
            <ImgF label="Background image (optional)" value={t.image} onChange={v => lstPatch('tiles', i, { image: v })} onPick={pickTo({ list: 'tiles', index: i, key: 'image', alt: 'alt' })} />
            {t.image && <TxtF label="Image alt text" value={t.alt} onChange={v => lstPatch('tiles', i, { alt: v })} />}
            <ColorF label="Background" value={t.bg} onChange={v => lstPatch('tiles', i, { bg: v })} />
            <ColorF label="Text color (empty = automatic)" value={t.color} onChange={v => lstPatch('tiles', i, { color: v })} />
            <TxtF label="Link (optional)" value={t.href} onChange={v => lstPatch('tiles', i, { href: v })} placeholder="/page or https://…" />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('tiles', { size: 'normal', icon: '', title: 'New tile', text: '', image: '', alt: '', bg: '#f1f5f9', color: '', href: '' })} style={lstAddBtn}>+ Add tile</button>
      </PanelAccordion>
      <PanelAccordion title="Bento Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Columns" value={c.columns || 3} onChange={v => set('columns', Number(v))} options={[[2, '2'], [3, '3'], [4, '4']]} />
        <NumF label="Row height px" value={c.rowHeight ?? 180} onChange={v => set('rowHeight', v)} min={100} max={400} step={10} />
        <NumF label="Gap px" value={c.gap ?? 16} onChange={v => set('gap', v)} min={0} max={48} />
        <SelF label="Hover effect" value={c.hover || 'lift'} onChange={v => set('hover', v)} options={[['lift', 'Lift'], ['zoom', 'Zoom image'], ['none', 'None']]} />
      </PanelAccordion>
    </>
  );
}
