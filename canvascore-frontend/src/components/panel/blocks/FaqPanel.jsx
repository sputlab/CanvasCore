import React from 'react';
import { Trash2, HelpCircle } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { inputStyle, labelStyle } from '../helpers';

// Content panel: FAQ
export default function FaqPanel({ ctx }) {
  const { selectedBlock, handleContentChange, lstPatch } = ctx;
  return (
    <PanelAccordion title="FAQ Items" icon={HelpCircle} defaultOpen={true}>
      {(selectedBlock.content.items || []).map((item, idx) => (
        <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <label style={{...labelStyle, margin: 0}}>Question {idx + 1}</label>
            <button onClick={() => {
              const newItems = [...selectedBlock.content.items]; newItems.splice(idx, 1); handleContentChange('items', newItems);
            }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
          </div>
          <input type="text" style={{...inputStyle, marginBottom:'10px'}} value={item.q ?? ''} onChange={e => lstPatch('items', idx, { q: e.target.value })} placeholder="Question" />
          <textarea rows="3" style={inputStyle} value={item.a ?? ''} onChange={e => lstPatch('items', idx, { a: e.target.value })} placeholder="Answer" />
        </div>
      ))}
      <button onClick={() => {
        const newItems = selectedBlock.content.items ? [...selectedBlock.content.items] : [];
        newItems.push({ q: 'New Question', a: 'Answer text...' });
        handleContentChange('items', newItems);
      }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Question</button>
    </PanelAccordion>
  );
}
