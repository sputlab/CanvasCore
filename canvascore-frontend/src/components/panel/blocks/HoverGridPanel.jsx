import React from 'react';
import { Sliders, SquareMousePointer } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ColorF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: HOVER_GRID
export default function HoverGridPanel({ ctx }) {
  const { c, set, pickTo, lstOf, lstPatch, lstRemove, lstAdd, lstMove, ARS } = ctx;
  const items = lstOf('items');
  return (
    <>
      <PanelAccordion title="Grid Items" icon={SquareMousePointer} defaultOpen={true}>
        {items.map((it, i) => (
          <ItemCard key={i} title={it.title || `Item ${i + 1}`} index={i} total={items.length} onMove={(d) => lstMove('items', i, d)} onRemove={() => lstRemove('items', i)}>
            <ImgF label="Image" value={it.image} onChange={v => lstPatch('items', i, { image: v })} onPick={pickTo({ list: 'items', index: i, key: 'image', alt: 'alt' })} />
            <TxtF label="Image alt text" value={it.alt} onChange={v => lstPatch('items', i, { alt: v })} />
            <TxtF label="Title" value={it.title} onChange={v => lstPatch('items', i, { title: v })} />
            <TxtF label="Text" value={it.text} onChange={v => lstPatch('items', i, { text: v })} multiline rows={2} />
            <TxtF label="Link (optional)" value={it.href} onChange={v => lstPatch('items', i, { href: v })} placeholder="/page or https://…" />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('items', { image: '', alt: '', title: 'New item', text: '', href: '' })} style={lstAddBtn}>+ Add item</button>
      </PanelAccordion>
      <PanelAccordion title="Hover Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Columns" value={c.columns || 3} onChange={v => set('columns', Number(v))} options={[[1, '1'], [2, '2'], [3, '3'], [4, '4']]} />
        <SelF label="Image shape" value={c.aspectRatio || '4 / 3'} onChange={v => set('aspectRatio', v)} options={[...ARS.filter(([v]) => v !== '21 / 9'), ['3 / 4', '3:4 (portrait)']]} />
        <NumF label="Gap px" value={c.gap ?? 16} onChange={v => set('gap', v)} min={0} max={48} />
        <NumF label="Corner radius px" value={c.radius ?? 12} onChange={v => set('radius', v)} min={0} max={40} />
        <SelF label="Reveal effect" value={c.effect || 'slide'} onChange={v => set('effect', v)} options={[['slide', 'Slide up'], ['fade', 'Fade in']]} />
        <ColorF label="Overlay color" value={c.overlay} onChange={v => set('overlay', v)} placeholder="rgba(15,23,42,0.72)" />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>On touch screens the text is always visible.</p>
      </PanelAccordion>
    </>
  );
}
