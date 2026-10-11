import React from 'react';
import { MapPin } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: MAPS
export default function MapsPanel({ ctx }) {
  const { selectedBlock, handleContentChange } = ctx;
  return (
    <PanelAccordion title="Map Settings" icon={MapPin} defaultOpen={true}>
      <label style={labelStyle}>Location / Address</label>
      <input type="text" style={inputStyle} value={selectedBlock.content.address || ''} onChange={e => handleContentChange('address', e.target.value)} placeholder="e.g. Colosseum, Rome, Italy" />
      <label style={labelStyle}>Zoom Level: {selectedBlock.content.zoom || 15}</label>
      <input type="range" min="1" max="20" style={{ width: '100%', cursor: 'pointer' }} value={parseInt(selectedBlock.content.zoom) || 15} onChange={e => handleContentChange('zoom', e.target.value)} />
    </PanelAccordion>
  );
}
