import React from 'react';
import { Sliders, MessagesSquare } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ChkF, ColorF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: TESTIMONIAL_WALL
export default function TestimonialWallPanel({ ctx }) {
  const { c, set, pickTo, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const items = lstOf('items');
  return (
    <>
      <PanelAccordion title="Testimonials" icon={MessagesSquare} defaultOpen={true}>
        {items.map((it, i) => (
          <ItemCard key={i} title={it.name || `Testimonial ${i + 1}`} index={i} total={items.length} onMove={(d) => lstMove('items', i, d)} onRemove={() => lstRemove('items', i)}>
            <TxtF label="Quote" value={it.quote} onChange={v => lstPatch('items', i, { quote: v })} multiline rows={3} />
            <TxtF label="Name" value={it.name} onChange={v => lstPatch('items', i, { name: v })} />
            <TxtF label="Role or company" value={it.role} onChange={v => lstPatch('items', i, { role: v })} />
            <SelF label="Stars" value={it.rating ?? 0} onChange={v => lstPatch('items', i, { rating: Number(v) })} options={[[0, 'None'], [5, '5'], [4, '4'], [3, '3'], [2, '2'], [1, '1']]} />
            <ImgF label="Photo (empty = initials)" value={it.avatar} onChange={v => lstPatch('items', i, { avatar: v })} onPick={pickTo({ list: 'items', index: i, key: 'avatar' })} />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('items', { quote: '', name: 'New customer', role: '', avatar: '', rating: 5 })} style={lstAddBtn}>+ Add testimonial</button>
      </PanelAccordion>
      <PanelAccordion title="Wall Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Columns" value={c.columns || 3} onChange={v => set('columns', Number(v))} options={[[1, '1'], [2, '2'], [3, '3'], [4, '4']]} />
        <NumF label="Gap px" value={c.gap ?? 20} onChange={v => set('gap', v)} min={0} max={48} />
        <SelF label="Style" value={c.cardStyle || 'card'} onChange={v => set('cardStyle', v)} options={[['card', 'Cards'], ['minimal', 'Minimal']]} />
        <ChkF label="Show star ratings" checked={c.showRatings !== false} onChange={v => set('showRatings', v)} />
        <ColorF label="Star color" value={c.starColor} onChange={v => set('starColor', v)} />
      </PanelAccordion>
    </>
  );
}
