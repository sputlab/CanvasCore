import React from 'react';
import { MonitorPlay } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: VIDEO
export default function VideoPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  const url = selectedBlock.content.url || '';
  // Same patterns as the renderers: anything else renders nothing
  const recognized = /(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i.test(url) || /vimeo\.com\/(?:video\/)?([0-9]+)/i.test(url);
  return (
    <PanelAccordion title="Video Settings" icon={MonitorPlay} defaultOpen={true}>
      <label style={labelStyle}>YouTube / Vimeo Link</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.url || ''} onChange={e => handleContentChange('url', e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
      {url.trim() !== '' && !recognized && (
        <p role="alert" style={{ fontSize: '11px', color: '#fbbf24', margin: '6px 0 0' }}>This doesn't look like a YouTube or Vimeo video link, so nothing will be shown. Paste the address of the video page.</p>
      )}
    </PanelAccordion>
  );
}
