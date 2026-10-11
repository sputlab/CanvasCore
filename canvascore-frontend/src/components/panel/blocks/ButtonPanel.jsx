import React from 'react';
import { SquareChartGantt } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: BUTTON
export default function ButtonPanel({ ctx }) {
  const { selectedBlock, handleContentChange, handleStyleChange, pages } = ctx;
  return (
    <PanelAccordion title="Button Settings" icon={SquareChartGantt} defaultOpen={true}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '20px', cursor: 'pointer' }}>
        <input type="checkbox" checked={selectedBlock.content.useGlobal ?? true} onChange={e => handleContentChange('useGlobal', e.target.checked)} /> Use Global Style (Brand)
      </label>
      <label style={labelStyle}>Button Size</label>
      <select style={inputStyle} onChange={e => {
        if (e.target.value === 'sm') { handleStyleChange('padding', '8px 16px'); handleStyleChange('fontSize', '14px'); }
        if (e.target.value === 'md') { handleStyleChange('padding', '12px 24px'); handleStyleChange('fontSize', '16px'); }
        if (e.target.value === 'lg') { handleStyleChange('padding', '18px 36px'); handleStyleChange('fontSize', '20px'); }
      }}>
        <option value="">Custom</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
      </select>
      <label style={labelStyle}>Text</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.text || 'Button'} onChange={e => handleContentChange('text', e.target.value)} />
      <label style={labelStyle}>Link</label>
      <select style={{...inputStyle, marginBottom: '8px'}} value={selectedBlock.content.url} onChange={e => handleContentChange('url', e.target.value)}>
        <option value="#">Select internal page...</option>
        {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>📄 {p.title}</option>)}
      </select>
      <input type="text" style={inputStyle} placeholder="Custom URL..." value={selectedBlock.content.url} onChange={e => handleContentChange('url', e.target.value)} />
    </PanelAccordion>
  );
}
