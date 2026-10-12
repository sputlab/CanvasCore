import React from 'react';
import { Layout, Mail } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, SelF, ChkF } from '../fields';
import { labelStyle, inputStyle, lstAddBtn } from '../helpers';
import { RichTextField } from '../../../editor/RichText';

const DEFAULT_FIELDS = [{ label: 'Name', type: 'text', required: true }, { label: 'Email', type: 'email', required: true }, { label: 'Message', type: 'textarea', required: true }];

// Same list as the renderers accept (FORM_TYPES / CC_FORM_TYPES)
const FIELD_TYPES = [['text', 'Short text'], ['email', 'Email'], ['tel', 'Phone'], ['number', 'Number'], ['url', 'Website address'], ['date', 'Date'], ['textarea', 'Long text']];

// Content panel: FORM
export default function FormPanel({ ctx }) {
  const { selectedBlock, handleContentChange, userRole } = ctx;
  // Same defaults as the renderer, so an older form without "fields" shows (and edits) what the site shows
  const formFields = Array.isArray(selectedBlock.content.fields) ? selectedBlock.content.fields : DEFAULT_FIELDS;
  const patchField = (idx, p) => handleContentChange('fields', formFields.map((f, i) => (i === idx ? { ...f, ...p } : f)));
  const moveField = (idx, d) => {
    const j = idx + d; if (j < 0 || j >= formFields.length) return;
    const next = [...formFields]; [next[idx], next[j]] = [next[j], next[idx]]; handleContentChange('fields', next);
  };
  return (
    <>
      <PanelAccordion title="Form Settings" icon={Mail} defaultOpen={true}>
        <label style={labelStyle}>Form Title</label>
        <RichTextField label="Form title" variant="basic" value={selectedBlock.content.title ?? '<h3>Contact Us</h3>'} onChange={(val) => handleContentChange('title', val)} />
        {userRole === 'admin' && <>
          <label style={labelStyle}>Receiving Email</label>
          <input type="email" style={inputStyle} value={selectedBlock.content.email || ''} onChange={e => handleContentChange('email', e.target.value)} placeholder="Leave blank for Global Email" />
        </>}
        <label style={labelStyle}>Submit Button Text</label>
        <input type="text" style={inputStyle} value={selectedBlock.content.btnText ?? ''} placeholder="Send Message" onChange={e => handleContentChange('btnText', e.target.value)} />
        <label style={labelStyle}>Message after sending</label>
        <input type="text" style={inputStyle} value={selectedBlock.content.successMsg ?? ''} placeholder="Sent!" onChange={e => handleContentChange('successMsg', e.target.value)} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>Shown to the visitor once the message has been sent.</p>
      </PanelAccordion>

      <PanelAccordion title="Form Fields" icon={Layout} defaultOpen={false}>
        {formFields.map((field, idx) => (
          <ItemCard key={idx} title={`Field ${idx + 1}`} index={idx} total={formFields.length} onMove={(d) => moveField(idx, d)}
            onRemove={() => handleContentChange('fields', formFields.filter((_, i) => i !== idx))}>
            <TxtF label="Label" value={field.label} onChange={v => patchField(idx, { label: v })} placeholder="e.g. Name" />
            <SelF label="Type" value={field.type || 'text'} onChange={v => patchField(idx, { type: v })} options={FIELD_TYPES} />
            <ChkF label="Required field" checked={field.required} onChange={v => patchField(idx, { required: v })} />
          </ItemCard>
        ))}
        <button onClick={() => handleContentChange('fields', [...formFields, { label: 'New Field', type: 'text', required: false }])} style={lstAddBtn}>+ Add Field</button>
      </PanelAccordion>
    </>
  );
}
