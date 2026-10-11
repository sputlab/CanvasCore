import React from 'react';
import { Sliders, Rows3, PanelTop } from 'lucide-react';
import { PanelAccordion, ItemCard } from '../fields';
import { lstAddBtn, labelStyle, inputStyle } from '../helpers';

// Content panel: ACCORDION, TABS
export default function AccordionTabsPanel({ ctx }) {
  const { selectedBlock, handleContentChange, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  return (
    <>
      <PanelAccordion title={selectedBlock.type === 'TABS' ? 'Tabs' : 'Accordion Items'} icon={selectedBlock.type === 'TABS' ? PanelTop : Rows3} defaultOpen={true}>
        {lstOf('items').map((it, idx) => (
          <ItemCard key={idx} title={`${selectedBlock.type === 'TABS' ? 'Tab' : 'Item'} ${idx + 1}`} index={idx} total={lstOf('items').length} onMove={(d) => lstMove('items', idx, d)} onRemove={() => lstRemove('items', idx)}>
            <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={it.title || ''} onChange={e => lstPatch('items', idx, { title: e.target.value })} placeholder="Title" />
            <textarea rows="4" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px' }} value={it.content || ''} onChange={e => lstPatch('items', idx, { content: e.target.value })} placeholder="Content: text or HTML (<p>, <strong>, <a>, <img>…)" />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('items', { title: selectedBlock.type === 'TABS' ? 'New tab' : 'New item', content: '<p>Content…</p>' })} style={lstAddBtn}>+ Add {selectedBlock.type === 'TABS' ? 'tab' : 'item'}</button>
      </PanelAccordion>

      <PanelAccordion title={selectedBlock.type === 'TABS' ? 'Tabs Settings' : 'Accordion Settings'} icon={Sliders} defaultOpen={false}>
        {selectedBlock.type === 'TABS' ? (
          <>
            <label style={labelStyle}>Style</label>
            <select style={inputStyle} value={selectedBlock.content.variant || 'underline'} onChange={e => handleContentChange('variant', e.target.value)}>
              <option value="underline">Underline</option>
              <option value="pills">Pills</option>
            </select>
            <label style={{ ...labelStyle, marginTop: '10px' }}>Tabs alignment</label>
            <select style={inputStyle} value={selectedBlock.content.tabAlign || 'left'} onChange={e => handleContentChange('tabAlign', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </>
        ) : (
          <>
            <label style={labelStyle}>Style</label>
            <select style={inputStyle} value={selectedBlock.content.variant || 'card'} onChange={e => handleContentChange('variant', e.target.value)}>
              <option value="card">Cards</option>
              <option value="flat">Flat (lines)</option>
            </select>
            <label style={{ ...labelStyle, marginTop: '10px' }}>Icon</label>
            <select style={inputStyle} value={selectedBlock.content.icon || 'plus'} onChange={e => handleContentChange('icon', e.target.value)}>
              <option value="plus">Plus (+)</option>
              <option value="chevron">Chevron (▾)</option>
              <option value="none">None</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '12px' }}>
              <input type="checkbox" checked={!!selectedBlock.content.openFirst} onChange={e => handleContentChange('openFirst', e.target.checked)} /> First item open by default
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginTop: '8px' }}>
              <input type="checkbox" checked={!!selectedBlock.content.allowMultiple} onChange={e => handleContentChange('allowMultiple', e.target.checked)} /> Allow several items open at once
            </label>
          </>
        )}
      </PanelAccordion>
    </>
  );
}
