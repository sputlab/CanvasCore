import React from 'react';
import { Sliders, GitCompare } from 'lucide-react';
import { PanelAccordion, ItemCard, Fld, TxtF, SelF, ChkF, ImgF } from '../fields';

// Content panel: BEFORE_AFTER
export default function BeforeAfterPanel({ ctx }) {
  const { c, set, pick, ARS } = ctx;
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
