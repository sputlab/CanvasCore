import React from 'react';
import { Search } from 'lucide-react';
import { PanelAccordion, TxtF, NumF } from '../fields';

// Content panel: SEARCH (site search box + results, on the published site)
export default function SearchPanel({ ctx }) {
  const { c, set } = ctx;
  return (
    <PanelAccordion title="Site Search" icon={Search} defaultOpen={true}>
      <TxtF label="Placeholder" value={c.placeholder} onChange={v => set('placeholder', v)} placeholder="Search the site…" />
      <TxtF label="Button text" value={c.buttonText} onChange={v => set('buttonText', v)} placeholder="Search" />
      <TxtF label="When nothing is found" value={c.noResults} onChange={v => set('noResults', v)} placeholder="No results for" />
      <NumF label="Results to show (1–50)" min={1} max={50} value={c.limit ?? 10} onChange={v => set('limit', v)} />
      <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>
        Searches the titles, descriptions and text of every published page and collection item (pages hidden from search engines
        are left out). The search list is rebuilt each time you publish. Tip: put this block on a page called “Search”; a link to
        <code style={{ color: '#38bdf8' }}> /search/?q=word </code> opens it with results.
      </p>
    </PanelAccordion>
  );
}
