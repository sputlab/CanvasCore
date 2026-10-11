import React from 'react';
import { Sliders, History } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, SelF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: TIMELINE
export default function TimelinePanel({ ctx }) {
  const { c, set, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
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
}
