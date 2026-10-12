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
        <input type="number" min="1" max="12" style={inputStyle} value={selectedBlock.content.columns ?? 2} onChange={e => handleContentChange('columns', Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
        <label style={labelStyle}>Gap (Spacing)</label>
        <input type="text" style={inputStyle} placeholder="20px" value={selectedBlock.content.gap ?? '20px'} onChange={e => handleContentChange('gap', e.target.value)} />
        <p style={{fontSize: '11px', color: '#94a3b8', marginTop: '10px'}}>Select the grid and add blocks from the Add tab (or drag them onto it in Layers): each block fills the next cell.</p>
      </PanelAccordion>
    </>
  );
}
