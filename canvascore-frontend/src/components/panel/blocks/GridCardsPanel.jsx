import React from 'react';
import { Layout, Columns3 } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: GRID, CARDS
export default function GridCardsPanel({ ctx }) {
  const { selectedBlock, updateBlock, setMediaPickerTarget } = ctx;
  const isCards = selectedBlock.type === 'CARDS';
  const items = selectedBlock.content.items || [];
  // Cards: the count is the number of items. Grid: the stored columns (older grids may lack it).
  const count = isCards ? items.length : (parseInt(selectedBlock.content.columns) || items.length || 2);
  return (
    <>
      <PanelAccordion title={isCards ? 'Cards' : 'Grid Settings'} icon={Columns3} defaultOpen={true}>
        <label style={labelStyle}>{isCards ? 'Number of cards' : 'Number of columns'}: {count}</label>
        <input type="range" min="1" max={isCards ? 12 : 24} style={{ width: '100%', cursor: 'pointer' }} value={count}
          aria-label={isCards ? 'Number of cards' : 'Number of columns'}
          onChange={e => {
            const n = parseInt(e.target.value);
            const newItems = Array(n).fill('').map((_, i) => items[i] !== undefined ? items[i] : (isCards ? `<h3>Card ${i+1}</h3><p>Describe it here.</p>` : `<p>Column ${i+1}</p>`));
            // Cards wrap on their own (auto-fit): only the list changes. A grid also stores its columns.
            updateBlock(selectedBlock.id, { content: { ...selectedBlock.content, ...(isCards ? {} : { columns: n }), items: newItems } });
          }} />
        {isCards && <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>Cards sit side by side and wrap to a new row when there is not enough room.</p>}
      </PanelAccordion>

      <PanelAccordion title={isCards ? 'Cards content' : 'Columns Content'} icon={Layout} defaultOpen={false}>
        {items.map((item, idx) => (
          <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #334155' }}>
            <label style={{...labelStyle, marginTop: 0}}>{isCards ? 'Card' : 'Item'} {idx + 1}</label>
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
