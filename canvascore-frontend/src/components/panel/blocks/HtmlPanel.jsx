import React from 'react';
import { Code } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: HTML
export default function HtmlPanel({ ctx }) {
  const { selectedBlock, handleContentChange, userRole } = ctx;
  const isAdmin = userRole === 'admin';
  return (
    <PanelAccordion title="Custom HTML" icon={Code} defaultOpen={true}>
      <label style={labelStyle}>HTML Code</label>
      <textarea rows="6" readOnly={!isAdmin} style={{...inputStyle, fontFamily: 'monospace', opacity: isAdmin ? 1 : 0.7}} value={selectedBlock.content.code || ''} onChange={e => handleContentChange('code', e.target.value)} />
      {!isAdmin && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>Only admins can change custom code. You can still move this block or delete it.</p>}
    </PanelAccordion>
  );
}
