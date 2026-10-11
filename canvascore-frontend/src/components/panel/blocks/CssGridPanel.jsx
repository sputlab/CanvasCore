import React from 'react';
import { Columns3 } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: CSS_GRID
export default function CssGridPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  return (
    <>
      <PanelAccordion title="CSS Grid Setup" icon={Columns3} defaultOpen={true}>
        <label style={labelStyle}>Number of Columns</label>
        <input type="number" style={inputStyle} value={selectedBlock.content.columns || 2} onChange={e => handleContentChange('columns', parseInt(e.target.value))} />
        <label style={labelStyle}>Gap (Spacing)</label>
        <input type="text" style={inputStyle} value={selectedBlock.content.gap || '20px'} onChange={e => handleContentChange('gap', e.target.value)} />
        <p style={{fontSize: '11px', color: '#94a3b8', marginTop: '10px'}}>Add elements inside this grid via the Navigator to see columns.</p>
      </PanelAccordion>
    </>
  );
}
