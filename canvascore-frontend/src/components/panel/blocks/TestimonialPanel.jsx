import React from 'react';
import { MessageSquareQuote } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: TESTIMONIAL
export default function TestimonialPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  return (
    <PanelAccordion title="Testimonial" icon={MessageSquareQuote} defaultOpen={true}>
      <label style={labelStyle}>Quote</label>
      <textarea rows="3" style={inputStyle} value={selectedBlock.content.quote || ''} onChange={e => handleContentChange('quote', e.target.value)} />
      <label style={labelStyle}>Author</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.author || ''} onChange={e => handleContentChange('author', e.target.value)} />
      <label style={labelStyle}>Role</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.role || ''} onChange={e => handleContentChange('role', e.target.value)} />
    </PanelAccordion>
  );
}
