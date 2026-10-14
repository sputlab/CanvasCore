import React from 'react';
import { Sliders, StarHalf, BarChart3 } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ChkF, ColorF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: REVIEW_SUMMARY
export default function ReviewSummaryPanel({ ctx }) {
  const { c, set, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const rows = lstOf('distribution');
  return (
    <>
      <PanelAccordion title="Rating" icon={StarHalf} defaultOpen={true}>
        <TxtF label="Title (empty = none)" value={c.title} onChange={v => set('title', v)} />
        <NumF label="Average rating (0–5)" value={c.average ?? 0} onChange={v => set('average', v)} min={0} max={5} step={0.1} />
        <NumF label="Number of reviews" value={c.total ?? 0} onChange={v => set('total', v)} min={0} />
        <TxtF label="Reviews label" value={c.totalLabel} onChange={v => set('totalLabel', v)} placeholder="reviews" />
        <TxtF label="Source (optional)" value={c.source} onChange={v => set('source', v)} placeholder="Based on verified reviews" />
        <TxtF label="Link text (empty = no link)" value={c.linkText} onChange={v => set('linkText', v)} placeholder="Read all reviews" />
        <TxtF label="Link" value={c.linkUrl} onChange={v => set('linkUrl', v)} placeholder="/reviews or https://…" />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Shown as a visual summary only: no rating markup for search engines, which don't accept ratings a business publishes about itself.</p>
      </PanelAccordion>
      <PanelAccordion title="Rating Breakdown" icon={BarChart3} defaultOpen={false}>
        <ChkF label="Show the breakdown bars" checked={c.showDistribution !== false} onChange={v => set('showDistribution', v)} />
        <SelF label="Next to each bar" value={c.rowValue || 'percent'} onChange={v => set('rowValue', v)} options={[['percent', 'Percentage'], ['count', 'Number of reviews'], ['none', 'Nothing']]} />
        {rows.map((r, i) => (
          <ItemCard key={i} title={`${r.stars ?? '?'} stars`} index={i} total={rows.length} onMove={(d) => lstMove('distribution', i, d)} onRemove={() => lstRemove('distribution', i)}>
            <SelF label="Stars" value={r.stars ?? 5} onChange={v => lstPatch('distribution', i, { stars: Number(v) })} options={[5, 4, 3, 2, 1].map(n => [n, String(n)])} />
            <NumF label="Number of reviews" value={r.count ?? 0} onChange={v => lstPatch('distribution', i, { count: v })} min={0} />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('distribution', { stars: 1, count: 0 })} style={lstAddBtn}>+ Add row</button>
      </PanelAccordion>
      <PanelAccordion title="Rating Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Layout" value={c.layout || 'side'} onChange={v => set('layout', v)} options={[['side', 'Score beside the bars'], ['stacked', 'Score above the bars']]} />
        <ColorF label="Star and bar color" value={c.color} onChange={v => set('color', v)} />
      </PanelAccordion>
    </>
  );
}
