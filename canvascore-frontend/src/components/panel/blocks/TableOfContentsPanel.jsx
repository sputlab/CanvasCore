import React from 'react';
import { Sliders, TableOfContents } from 'lucide-react';
import { PanelAccordion, TxtF, NumF, SelF, ChkF, ColorF } from '../fields';

// Content panel: TABLE_OF_CONTENTS
export default function TableOfContentsPanel({ ctx }) {
  const { c, set } = ctx;
  return (
    <>
      <PanelAccordion title="Table of Contents" icon={TableOfContents} defaultOpen={true}>
        <TxtF label="Title (empty = none)" value={c.title} onChange={v => set('title', v)} />
        <SelF label="Headings to list" value={c.levels === 'h2h3' ? 'h2h3' : 'h2'} onChange={v => set('levels', v)} options={[['h2', 'Main headings (H2)'], ['h2h3', 'Main and sub-headings (H2 + H3)']]} />
        <ChkF label="Number the entries" checked={c.numbered === true} onChange={v => set('numbered', v)} />
        <ChkF label="Highlight the section being read" checked={c.highlight !== false} onChange={v => set('highlight', v)} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Lists the headings of the page automatically: set the style of a Text block to Heading 2 or 3. With no headings the block is hidden on the published page.</p>
      </PanelAccordion>
      <PanelAccordion title="Contents Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Style" value={c.layout === 'plain' ? 'plain' : 'card'} onChange={v => set('layout', v)} options={[['card', 'Card'], ['plain', 'Plain']]} />
        <ColorF label="Accent color (empty = brand color)" value={c.accent} onChange={v => set('accent', v)} />
        <ChkF label="Stay in view while scrolling (sticky)" checked={c.sticky === true} onChange={v => set('sticky', v)} />
        {c.sticky === true && <NumF label="Distance from the top px" value={c.stickyTop ?? 90} onChange={v => set('stickyTop', v)} min={0} max={300} />}
        <NumF label="Space above a heading when jumping to it px" value={c.offset ?? 80} onChange={v => set('offset', v)} min={0} max={300} />
      </PanelAccordion>
    </>
  );
}
