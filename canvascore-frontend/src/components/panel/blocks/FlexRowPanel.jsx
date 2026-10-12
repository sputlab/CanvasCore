import React from 'react';
import { Columns3 } from 'lucide-react';
import { PanelAccordion, SelF, TxtF } from '../fields';

// Content panel: FLEX_ROW. A row of blocks side by side: its layout lives in the block's styles.
export default function FlexRowPanel({ ctx }) {
  const { selectedBlock, handleStyleChange } = ctx;
  const st = selectedBlock.styles || {};
  return (
    <PanelAccordion title="Row Layout" icon={Columns3} defaultOpen={true}>
      <SelF label="Direction" value={st.flexDirection || 'row'} onChange={v => handleStyleChange('flexDirection', v)}
        options={[['row', 'Side by side (left → right)'], ['row-reverse', 'Side by side (right → left)'], ['column', 'Stacked (top → bottom)']]} />
      <TxtF label="Space between blocks" value={st.gap ?? ''} onChange={v => handleStyleChange('gap', v)} placeholder="e.g. 20px" />
      <SelF label="Horizontal alignment" value={st.justifyContent || 'flex-start'} onChange={v => handleStyleChange('justifyContent', v)}
        options={[['flex-start', 'Start'], ['center', 'Center'], ['flex-end', 'End'], ['space-between', 'Spread out (space between)'], ['space-around', 'Spread out (space around)'], ['space-evenly', 'Spread out evenly']]} />
      <SelF label="Vertical alignment" value={st.alignItems || 'stretch'} onChange={v => handleStyleChange('alignItems', v)}
        options={[['stretch', 'Same height (stretch)'], ['flex-start', 'Top'], ['center', 'Middle'], ['flex-end', 'Bottom']]} />
      <SelF label="When there is not enough room" value={st.flexWrap || 'nowrap'} onChange={v => handleStyleChange('flexWrap', v)}
        options={[['wrap', 'Wrap to a new line'], ['nowrap', 'Keep on one line']]} />
      <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>Give the blocks inside a width in their Style tab (e.g. 50%) to control how much room each one takes.</p>
    </PanelAccordion>
  );
}
