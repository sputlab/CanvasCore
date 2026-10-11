import React from 'react';
import { Layout, Trash2, Mail } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';
import { RichTextField } from '../../../editor/RichText';

const DEFAULT_FIELDS = [{ label: 'Name', type: 'text', required: true }, { label: 'Email', type: 'email', required: true }, { label: 'Message', type: 'textarea', required: true }];

// Content panel: FORM
export default function FormPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  // Same defaults as the renderer, so an older form without "fields" shows (and edits) what the site shows
  const formFields = Array.isArray(selectedBlock.content.fields) ? selectedBlock.content.fields : DEFAULT_FIELDS;
  const patchField = (idx, p) => handleContentChange('fields', formFields.map((f, i) => (i === idx ? { ...f, ...p } : f)));
  return (
    <>
      <PanelAccordion title="Form Settings" icon={Mail} defaultOpen={true}>
        <label style={labelStyle}>Form Title</label>
        <RichTextField label="Form title" variant="basic" value={selectedBlock.content.title ?? '<h3>Contact Us</h3>'} onChange={(val) => handleContentChange('title', val)} />
        <label style={labelStyle}>Receiving Email</label>
        <input type="email" style={inputStyle} value={selectedBlock.content.email || ''} onChange={e => handleContentChange('email', e.target.value)} placeholder="Leave blank for Global Email" />
        <label style={labelStyle}>Submit Button Text</label>
        <input type="text" style={inputStyle} value={selectedBlock.content.btnText || ''} onChange={e => handleContentChange('btnText', e.target.value)} />
      </PanelAccordion>

      <PanelAccordion title="Form Fields" icon={Layout} defaultOpen={false}>
        {formFields.map((field, idx) => (
          <div key={idx} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label style={{...labelStyle, margin: 0}}>Field {idx + 1}</label>
              <button onClick={() => {
                handleContentChange('fields', formFields.filter((_, i) => i !== idx));
              }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
            </div>
            <input type="text" value={field.label ?? ''} onChange={e => patchField(idx, { label: e.target.value })} style={{...inputStyle, marginBottom:'5px'}} placeholder="Label (e.g. Name)" />
            <select value={field.type || 'text'} onChange={e => patchField(idx, { type: e.target.value })} style={{...inputStyle, marginBottom: '5px'}}>
              <option value="text">Short Text</option><option value="email">Email</option><option value="textarea">Long Text</option><option value="number">Number</option>
            </select>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="checkbox" checked={!!field.required} onChange={e => patchField(idx, { required: e.target.checked })} /> Required Field
            </label>
          </div>
        ))}
        <button onClick={() => {
          const flds = [...formFields];
          flds.push({ label: 'New Field', type: 'text', required: false });
          handleContentChange('fields', flds);
        }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Field</button>
      </PanelAccordion>
    </>
  );
}
