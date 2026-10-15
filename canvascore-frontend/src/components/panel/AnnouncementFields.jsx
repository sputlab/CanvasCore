import React from 'react';
import { TxtF, SelF, ChkF, ColorF } from './fields';

// The fields of an announcement bar (`value` = the block's content). onChange gets only what changed ({ key: value }),
// to be merged into the live content: two quick edits can never overwrite each other.
const ANNOUNCEMENT_PRESETS = [['info', 'Dark'], ['promo', 'Brand color'], ['warning', 'Warning (yellow)'], ['success', 'Success (green)']];

export default function AnnouncementFields({ value, onChange }) {
  const c = value && typeof value === 'object' ? value : {};
  const set = (k) => (v) => onChange({ [k]: v });
  return (
    <>
      <TxtF label="Message" value={c.text} onChange={set('text')} multiline rows={2} placeholder="Free shipping on orders over €50" />
      <TxtF label="Icon (one emoji, optional)" value={c.icon} onChange={set('icon')} />
      <TxtF label="Link text (empty = no link)" value={c.linkText} onChange={set('linkText')} placeholder="Shop now" />
      <TxtF label="Link" value={c.linkUrl} onChange={set('linkUrl')} placeholder="/offers or https://…" />
      <SelF label="Colors" value={ANNOUNCEMENT_PRESETS.some(([id]) => id === c.preset) ? c.preset : 'info'} onChange={set('preset')} options={ANNOUNCEMENT_PRESETS} />
      <ColorF label="Background (empty = from the colors above)" value={c.bg} onChange={set('bg')} />
      <ColorF label="Text color (empty = from the colors above)" value={c.color} onChange={set('color')} />
      <SelF label="Alignment" value={c.align === 'left' ? 'left' : 'center'} onChange={set('align')} options={[['center', 'Centered'], ['left', 'Left']]} />
      <ChkF label="Stay at the top while scrolling" checked={c.sticky === true} onChange={set('sticky')} />
      <ChkF label="Visitors can dismiss it (remembered until the message changes)" checked={c.dismissible !== false} onChange={set('dismissible')} />
    </>
  );
}
