import React from 'react';
import { Sliders, Table2 } from 'lucide-react';
import { PanelAccordion, TxtF, NumF, ChkF } from '../fields';

// Content panel: TABLE
export default function TablePanel({ ctx }) {
  const { c, set } = ctx;
  return (
    <>
      <PanelAccordion title="Data Table" icon={Table2} defaultOpen={true}>
        <TxtF label="Data — one row per line, cells separated by | or Tab" value={c.data} onChange={v => set('data', v)} multiline rows={9} mono placeholder={'Name | Role | City\nAnna | CEO | Rome'} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>Tip: you can paste straight from Excel or Google Sheets (cells arrive separated by Tab).</p>
        <TxtF label="Caption (optional)" value={c.caption} onChange={v => set('caption', v)} />
      </PanelAccordion>
      <PanelAccordion title="Table Options" icon={Sliders} defaultOpen={false}>
        <ChkF label="First row is the header" checked={c.headerRow !== false} onChange={v => set('headerRow', v)} />
        <ChkF label="First column is a header (row labels)" checked={c.rowHeaders} onChange={v => set('rowHeaders', v)} />
        <ChkF label="Striped rows" checked={c.striped !== false} onChange={v => set('striped', v)} />
        <ChkF label="Cell borders" checked={c.bordered} onChange={v => set('bordered', v)} />
        <ChkF label="Compact" checked={c.compact} onChange={v => set('compact', v)} />
        <ChkF label="Sticky header (scrolls inside)" checked={c.stickyHeader} onChange={v => set('stickyHeader', v)} />
        {c.stickyHeader && <NumF label="Max height px" min={0} max={1200} value={c.maxHeight ?? 0} onChange={v => set('maxHeight', v)} />}
      </PanelAccordion>
    </>
  );
}
