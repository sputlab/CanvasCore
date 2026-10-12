import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: IMAGE
export default function ImagePanel({ ctx }) {
  const { selectedBlock, handleContentChange, setMediaPickerTarget } = ctx;
  return (
    <PanelAccordion title="Image Settings" icon={ImageIcon} defaultOpen={true}>
      <label style={labelStyle}>Image URL</label>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <input type="text" style={{...inputStyle, flex: 1}} value={selectedBlock.content.src || ''} onChange={e => handleContentChange('src', e.target.value)} />
        <button type="button" title="Choose from the media library" aria-label="Choose from the media library" onClick={() => setMediaPickerTarget('src')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
      </div>
      <label style={labelStyle}>Alt Text (SEO)</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.alt || ''} onChange={e => handleContentChange('alt', e.target.value)} />

      <label style={labelStyle}>Object-Fit Mode</label>
      <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.objectFit || 'cover'} onChange={e => handleContentChange('objectFit', e.target.value)}>
        <option value="cover">Cover (Fill and crop)</option>
        <option value="contain">Contain (Show full without crop)</option>
        <option value="fill">Fill (Stretch to fit)</option>
      </select>

      <label style={labelStyle}>Aspect Ratio</label>
      <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.aspectRatio || 'auto'} onChange={e => handleContentChange('aspectRatio', e.target.value)}>
        <option value="auto">Auto (original)</option>
        <option value="1 / 1">1:1 (Square)</option>
        <option value="4 / 3">4:3</option>
        <option value="3 / 2">3:2</option>
        <option value="16 / 9">16:9 (Wide)</option>
        <option value="21 / 9">21:9 (Ultra-wide)</option>
        <option value="2 / 3">2:3 (Portrait)</option>
      </select>

      <label style={labelStyle}>Focus / Object Position</label>
      <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.objectPosition || 'center'} onChange={e => handleContentChange('objectPosition', e.target.value)}>
        <option value="center">Center</option>
        <option value="top">Top</option>
        <option value="bottom">Bottom</option>
        <option value="left">Left</option>
        <option value="right">Right</option>
      </select>

      <label style={labelStyle}>Zoom (Scale)</label>
      <input type="range" min="0.5" max="2" step="0.1" style={{width: '100%', cursor: 'pointer'}} value={selectedBlock.content.scale || 1} onChange={e => handleContentChange('scale', parseFloat(e.target.value))} />
    </PanelAccordion>
  );
}
