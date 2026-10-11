import React from 'react';
import { Sliders, Hash } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ChkF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: COUNTERS
export default function CountersPanel({ ctx }) {
  const { c, set, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
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
}
