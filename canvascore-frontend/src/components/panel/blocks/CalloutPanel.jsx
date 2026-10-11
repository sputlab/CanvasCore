import React from 'react';
import { Info } from 'lucide-react';
import { PanelAccordion, TxtF, SelF, ChkF } from '../fields';

// Content panel: CALLOUT
export default function CalloutPanel({ ctx }) {
  const { c, set } = ctx;
  return (
    <PanelAccordion title="Callout" icon={Info} defaultOpen={true}>
      <SelF label="Type" value={c.variant || 'info'} onChange={v => set('variant', v)} options={[['info', 'Info'], ['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['note', 'Note']]} />
      <TxtF label="Title (optional)" value={c.title} onChange={v => set('title', v)} />
      <TxtF label="Text (HTML allowed)" value={c.text} onChange={v => set('text', v)} multiline rows={5} mono />
      <ChkF label="Show icon" checked={c.showIcon !== false} onChange={v => set('showIcon', v)} />
    </PanelAccordion>
  );
}
