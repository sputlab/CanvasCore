import React from 'react';
import { HelpCircle } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: FAQ
export default function FaqPanel({ ctx }) {
  const { selectedBlock, lstPatch, lstMove, lstRemove, lstAdd } = ctx;
  const items = Array.isArray(selectedBlock.content.items) ? selectedBlock.content.items : [];
  return (
    <PanelAccordion title="FAQ Items" icon={HelpCircle} defaultOpen={true}>
      {items.map((item, idx) => (
        <ItemCard key={idx} title={`Question ${idx + 1}`} index={idx} total={items.length} onMove={(d) => lstMove('items', idx, d)} onRemove={() => lstRemove('items', idx)}>
          <TxtF label="Question" value={item.q} onChange={v => lstPatch('items', idx, { q: v })} placeholder="Question" />
          <TxtF label="Answer" multiline rows={3} value={item.a} onChange={v => lstPatch('items', idx, { a: v })} placeholder="Answer" />
        </ItemCard>
      ))}
      <button onClick={() => lstAdd('items', { q: 'New Question', a: 'Answer text...' })} style={lstAddBtn}>+ Add Question</button>
    </PanelAccordion>
  );
}
