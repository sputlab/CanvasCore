import React from 'react';
import { Sliders, ListOrdered } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, SelF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: STEPS
export default function StepsPanel({ ctx }) {
  const { c, set, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
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
}
