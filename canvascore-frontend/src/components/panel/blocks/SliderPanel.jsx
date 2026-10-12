import React from 'react';
import { placeholderImage } from '../../../editor/placeholder';
import { Sliders, Images } from 'lucide-react';
import { PanelAccordion, ItemCard, ImgF, TxtF } from '../fields';
import { labelStyle, inputStyle, lstAddBtn } from '../helpers';

// Content panel: SLIDER
export default function SliderPanel({ ctx }) {
  const { selectedBlock, handleContentChange, setMediaPickerTarget, lstPatch, lstMove, lstRemove, lstAdd } = ctx;
  const images = Array.isArray(selectedBlock.content.images) ? selectedBlock.content.images : [];
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
        {images.map((img, idx) => (
          <ItemCard key={idx} title={`Slide ${idx + 1}`} index={idx} total={images.length} onMove={(d) => lstMove('images', idx, d)} onRemove={() => lstRemove('images', idx)}>
            <ImgF label="Image" value={img.src} onChange={v => lstPatch('images', idx, { src: v })} onPick={() => setMediaPickerTarget({ type: 'slider_img', index: idx })} />
            <TxtF label="Alt text (what the image shows)" value={img.alt} onChange={v => lstPatch('images', idx, { alt: v })} />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('images', { src: placeholderImage(800, 400), alt: 'New Slide' })} style={lstAddBtn}>+ Add Slide</button>
      </PanelAccordion>
    </>
  );
}
