import React from 'react';
import { MonitorPlay } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: VIDEO
export default function VideoPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  return (
    <PanelAccordion title="Video Settings" icon={MonitorPlay} defaultOpen={true}>
      <label style={labelStyle}>YouTube / Vimeo Link</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.url || ''} onChange={e => handleContentChange('url', e.target.value)} />
    </PanelAccordion>
  );
}
