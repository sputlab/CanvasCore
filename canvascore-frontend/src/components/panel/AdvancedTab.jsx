import React from 'react';
import { MoveUp, Code } from 'lucide-react';
import { PanelAccordion } from './fields';
import { labelStyle, inputStyle } from './helpers';

// Advanced tab (every block): scroll animation and, for admins, CSS id/classes/custom CSS.
export default function AdvancedTab({ ctx }) {
  const { selectedBlock, handleContentChange, handleStyleChange, userRole } = ctx;
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>

{userRole === 'admin' && (
    <PanelAccordion title="Custom Code" icon={Code} defaultOpen={false}>
      <label style={labelStyle}>CSS ID (Unique)</label>
      <input type="text" value={selectedBlock.content.customId || ''} onChange={e => handleContentChange('customId', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} style={inputStyle} placeholder="e.g. my-hero-section" />

      <label style={labelStyle}>CSS Classes (Space separated)</label>
      <input type="text" value={selectedBlock.content.customClass || ''} onChange={e => handleContentChange('customClass', e.target.value)} style={inputStyle} placeholder="e.g. shadow-lg text-center" />

      <label style={labelStyle}>Custom CSS</label>
      <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#94a3b8' }}>Use <strong style={{color:'#38bdf8'}}>__THIS__</strong> to target this specific element.</p>
      <textarea rows="6" value={selectedBlock.content.customCss || ''} onChange={e => handleContentChange('customCss', e.target.value)} style={{...inputStyle, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre', color: '#a78bfa'}} placeholder="__THIS__ {\n  filter: blur(5px);\n  transform: rotate(2deg);\n}" />
    </PanelAccordion>
    )}


    <PanelAccordion title="Effects & Animations" icon={MoveUp} defaultOpen={false}>
      <label style={labelStyle}>Scroll Animation</label>
      <select style={{...inputStyle, borderColor: '#38bdf8', marginBottom: 0}} value={selectedBlock.styles.animation || 'none'} onChange={e => handleStyleChange('animation', e.target.value)}>
        <option value="none">None</option><option value="fade-up">Fade Up</option><option value="fade-in">Fade In</option><option value="zoom-in">Zoom In</option>
      </select>
    </PanelAccordion>
  </div>
  );
}
