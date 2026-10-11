import React from 'react';
import { Code } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: HTML
export default function HtmlPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  return (
    <PanelAccordion title="Custom HTML" icon={Code} defaultOpen={true}>
      <label style={labelStyle}>HTML Code</label>
      <textarea rows="6" style={{...inputStyle, fontFamily: 'monospace'}} value={selectedBlock.content.code || ''} onChange={e => handleContentChange('code', e.target.value)} />
    </PanelAccordion>
  );
}
