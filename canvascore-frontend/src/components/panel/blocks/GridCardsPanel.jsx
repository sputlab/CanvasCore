import React from 'react';
import { Layout, Columns3 } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: GRID, CARDS
export default function GridCardsPanel({ ctx }) {
  const { selectedBlock, updateBlock, setMediaPickerTarget } = ctx;
  return (
    <>
      <PanelAccordion title="Grid Settings" icon={Columns3} defaultOpen={true}>
        <label style={labelStyle}>Number of Columns: {selectedBlock.content.columns || 2}</label>
        <input type="range" min="1" max="24" style={{ width: '100%', cursor: 'pointer' }} value={parseInt(selectedBlock.content.columns) || 2}
          onChange={e => {
            const cols = parseInt(e.target.value);
            const currentItems = selectedBlock.content.items || [];
            const newItems = Array(cols).fill('').map((_, i) => currentItems[i] !== undefined ? currentItems[i] : `<p>Column ${i+1}</p>`);
            updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, columns: cols, items: newItems } });
          }} />
      </PanelAccordion>

      <PanelAccordion title="Columns Content" icon={Layout} defaultOpen={false}>
        {selectedBlock.content.items.map((item, idx) => (
          <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #334155' }}>
            <label style={{...labelStyle, marginTop: 0}}>Item {idx + 1}</label>
            <textarea rows="4" style={inputStyle} value={item} onChange={e => {
              const newItems = [...selectedBlock.content.items]; newItems[idx] = e.target.value; updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, items: newItems } });
            }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
              <button onClick={() => setMediaPickerTarget({ type: 'grid_item', index: idx })} style={{ flex: 1, padding: '6px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>+ Image</button>
              <button onClick={() => {
                const newItems = [...selectedBlock.content.items]; newItems[idx] += `<a href="#" style="display:inline-block; padding:10px 20px; background:#3b82f6; color:#fff; border-radius:6px; text-decoration:none; margin-top:10px; font-weight:bold;">Click Here</a>`;
                updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, items: newItems } });
              }} style={{ flex: 1, padding: '6px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>+ Button</button>
            </div>
          </div>
        ))}
      </PanelAccordion>
    </>
  );
}
