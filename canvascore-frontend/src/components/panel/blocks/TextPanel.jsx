import React from 'react';
import { Layout, Image as ImageIcon } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';
import { RichTextField } from '../../../editor/RichText';

// Content panel: TEXT, IMAGE_TEXT
export default function TextPanel({ ctx }) {
  const { selectedBlock, handleContentChange, setMediaPickerTarget } = ctx;
  return (
    <PanelAccordion title="Text Content" icon={Layout} defaultOpen={true}>
      {selectedBlock.type === 'IMAGE_TEXT' && (
        <>
          <label style={labelStyle}>Image URL</label>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <input type="text" style={{...inputStyle, flex: 1}} value={selectedBlock.content.src || ''} onChange={e => handleContentChange('src', e.target.value)} />
            <button onClick={() => setMediaPickerTarget('src')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
          </div>
          <label style={labelStyle}>Image description (alt text)</label>
          <input type="text" style={inputStyle} value={selectedBlock.content.alt ?? ''} onChange={e => handleContentChange('alt', e.target.value)} placeholder="What the image shows, for screen readers and search engines" />
          <label style={labelStyle}>Layout</label>
          <select style={inputStyle} value={selectedBlock.content.layout || 'img-left'} onChange={e => handleContentChange('layout', e.target.value)}>
            <option value="img-left">Image Left</option><option value="img-right">Image Right</option>
          </select>
        </>
      )}
      <label style={labelStyle}>Text</label>
      <RichTextField label="Text" variant="full" minHeight={140} value={selectedBlock.content.text || ''} onChange={(val) => handleContentChange('text', val)} />
    </PanelAccordion>
  );
}
