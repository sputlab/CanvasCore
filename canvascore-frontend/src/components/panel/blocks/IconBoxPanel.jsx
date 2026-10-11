import React from 'react';
import { Star } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: ICON_BOX
export default function IconBoxPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  return (
    <PanelAccordion title="Icon Box Content" icon={Star} defaultOpen={true}>
      <label style={labelStyle}>Icon / Emoji</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.icon || ''} onChange={e => handleContentChange('icon', e.target.value)} />
      <label style={labelStyle}>Title</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.title || ''} onChange={e => handleContentChange('title', e.target.value)} />
      <label style={labelStyle}>Description</label>
      <textarea rows="3" style={inputStyle} value={selectedBlock.content.description || ''} onChange={e => handleContentChange('description', e.target.value)} />
    </PanelAccordion>
  );
}
