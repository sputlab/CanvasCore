import React from 'react';
import { Sliders, Image as ImageIcon, GalleryHorizontal } from 'lucide-react';
import { PanelAccordion, ItemCard } from '../fields';
import { labelStyle, inputStyle, lstAddBtn } from '../helpers';

// Content panel: GALLERY
export default function GalleryPanel({ ctx }) {
  const { selectedBlock, handleContentChange, setMediaPickerTarget, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  return (
    <>
      <PanelAccordion title="Gallery Images" icon={GalleryHorizontal} defaultOpen={true}>
        {lstOf('images').map((im, idx) => (
          <ItemCard key={idx} title={`Image ${idx + 1}`} index={idx} total={lstOf('images').length} onMove={(d) => lstMove('images', idx, d)} onRemove={() => lstRemove('images', idx)}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              {im.src ? <img src={im.src} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} /> : null}
              <input type="text" style={{ ...inputStyle, flex: 1 }} value={im.src || ''} onChange={e => lstPatch('images', idx, { src: e.target.value })} placeholder="Image URL" />
              <button onClick={() => setMediaPickerTarget({ type: 'gallery_img', index: idx })} title="Pick from media" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><ImageIcon size={14} /></button>
            </div>
            <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={im.alt || ''} onChange={e => lstPatch('images', idx, { alt: e.target.value })} placeholder="Alt text (accessibility / SEO)" />
            <input type="text" style={inputStyle} value={im.caption || ''} onChange={e => lstPatch('images', idx, { caption: e.target.value })} placeholder="Caption (shown in lightbox / under image)" />
          </ItemCard>
        ))}
        <button onClick={() => setMediaPickerTarget({ type: 'gallery_add' })} style={{ ...lstAddBtn, marginBottom: '6px' }}>+ Add image from media</button>
        <button onClick={() => lstAdd('images', { src: '', alt: '', caption: '' })} style={{ ...lstAddBtn, borderStyle: 'solid', borderWidth: '1px', color: '#94a3b8' }}>+ Add empty slot (paste URL)</button>
      </PanelAccordion>
      <PanelAccordion title="Gallery Settings" icon={Sliders} defaultOpen={false}>
        <label style={labelStyle}>Layout</label>
        <select style={inputStyle} value={selectedBlock.content.layout || 'grid'} onChange={e => handleContentChange('layout', e.target.value)}>
          <option value="grid">Grid (uniform crops)</option>
          <option value="masonry">Masonry (natural ratios)</option>
        </select>
        <label style={{ ...labelStyle, marginTop: '10px' }}>Columns</label>
        <select style={inputStyle} value={selectedBlock.content.columns || 3} onChange={e => handleContentChange('columns', parseInt(e.target.value, 10))}>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <label style={{ ...labelStyle, marginTop: '10px' }}>Gap (px)</label>
        <input type="number" min="0" max="80" style={inputStyle} value={selectedBlock.content.gap ?? 12} onChange={e => handleContentChange('gap', parseInt(e.target.value, 10) || 0)} />
        {(selectedBlock.content.layout || 'grid') === 'grid' && (
          <>
            <label style={{ ...labelStyle, marginTop: '10px' }}>Thumbnail ratio</label>
            <select style={inputStyle} value={selectedBlock.content.aspectRatio || '1 / 1'} onChange={e => handleContentChange('aspectRatio', e.target.value)}>
              <option value="1 / 1">1:1 (Square)</option>
              <option value="4 / 3">4:3</option>
              <option value="3 / 2">3:2</option>
              <option value="16 / 9">16:9</option>
              <option value="2 / 3">2:3 (Portrait)</option>
              <option value="auto">Auto (original ratio)</option>
            </select>
          </>
        )}
        <label style={{ ...labelStyle, marginTop: '10px' }}>Corner radius</label>
        <input type="text" style={inputStyle} value={selectedBlock.content.borderRadius || '8px'} onChange={e => handleContentChange('borderRadius', e.target.value)} placeholder="8px" />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '12px' }}>
          <input type="checkbox" checked={selectedBlock.content.lightbox !== false} onChange={e => handleContentChange('lightbox', e.target.checked)} /> Open images in a lightbox
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '8px' }}>
          <input type="checkbox" checked={!!selectedBlock.content.showCaptions} onChange={e => handleContentChange('showCaptions', e.target.checked)} /> Show captions under images
        </label>
      </PanelAccordion>
    </>
  );
}
