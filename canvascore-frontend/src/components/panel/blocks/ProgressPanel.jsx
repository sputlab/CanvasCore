import React from 'react';
import { Sliders, BarChart3 } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, ChkF, ColorF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: PROGRESS
export default function ProgressPanel({ ctx }) {
  const { c, set, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
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
}
