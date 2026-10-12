import React from 'react';
import { Sliders, Image as ImageIcon, Trash2, Images } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: SLIDER
export default function SliderPanel({ ctx }) {
  const { selectedBlock, handleContentChange, setMediaPickerTarget, lstPatch } = ctx;
  return (
    <>
      <PanelAccordion title="Slider Settings" icon={Sliders} defaultOpen={true}>
        <label style={labelStyle}>Transition Effect</label>
        <select style={inputStyle} value={selectedBlock.content.effect || 'slide'} onChange={e => handleContentChange('effect', e.target.value)}>
          <option value="slide">Slide (Horizontal Swipe)</option>
          <option value="fade">Fade (Crossfade)</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f8fafc', margin: '15px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={selectedBlock.content.autoplay ?? true} onChange={e => handleContentChange('autoplay', e.target.checked)} style={{width:'16px', height:'16px'}} /> Enable Autoplay
        </label>
        {selectedBlock.content.autoplay !== false && (
          <>
            <label style={labelStyle}>Delay (ms)</label>
            <input type="number" style={inputStyle} min="500" step="100" placeholder="3000" value={selectedBlock.content.delay ?? ''} onChange={e => handleContentChange('delay', e.target.value === '' ? undefined : Math.max(500, parseInt(e.target.value, 10) || 3000))} />
          </>
        )}

        <label style={{...labelStyle, marginTop: '15px'}}>Aspect Ratio</label>
        <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.aspectRatio || '16 / 9'} onChange={e => handleContentChange('aspectRatio', e.target.value)}>
          <option value="1 / 1">1:1 (Square)</option>
        <option value="4 / 3">4:3</option>
        <option value="3 / 2">3:2</option>
        <option value="16 / 9">16:9 (Wide)</option>
        <option value="21 / 9">21:9 (Ultra-wide)</option>
        <option value="2 / 3">2:3 (Portrait)</option>
        </select>

        <label style={labelStyle}>Image Fit</label>
        <select style={{...inputStyle, marginBottom: '15px'}} value={selectedBlock.content.objectFit || 'cover'} onChange={e => handleContentChange('objectFit', e.target.value)}>
          <option value="cover">Cover (fill and crop)</option>
          <option value="contain">Contain (show full)</option>
          <option value="fill">Fill (stretch)</option>
        </select>

        <label style={labelStyle}>Focus / Object Position</label>
        <select style={inputStyle} value={selectedBlock.content.objectPosition || 'center'} onChange={e => handleContentChange('objectPosition', e.target.value)}>
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </PanelAccordion>

      <PanelAccordion title="Images" icon={Images} defaultOpen={false}>
        {(selectedBlock.content.images || []).map((img, idx) => (
          <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{...labelStyle, margin: 0}}>Slide {idx + 1}</label>
              <button onClick={() => {
                const newImgs = [...selectedBlock.content.images]; newImgs.splice(idx, 1); handleContentChange('images', newImgs);
              }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <input type="text" style={{...inputStyle, flex: 1, marginBottom: 0}} value={img.src ?? ''} onChange={e => lstPatch('images', idx, { src: e.target.value })} placeholder="Image URL" />
              <button onClick={() => setMediaPickerTarget({ type: 'slider_img', index: idx })} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
            </div>
            <input type="text" style={inputStyle} value={img.alt || ''} onChange={e => lstPatch('images', idx, { alt: e.target.value })} placeholder="Alt Text (SEO)" />
          </div>
        ))}
        <button onClick={() => {
          const newImgs = selectedBlock.content.images ? [...selectedBlock.content.images] : [];
          newImgs.push({ src: 'https://via.placeholder.com/800x400', alt: 'New Slide' });
          handleContentChange('images', newImgs);
        }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Slide</button>
      </PanelAccordion>
    </>
  );
}
