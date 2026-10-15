import React from 'react';
import { Music, Film } from 'lucide-react';
import { kindOf } from '../editor/mediaInfo';

// The preview of a library item: the image itself, or a tile with the type of file for audio and video
// (a video is not loaded just to draw a thumbnail: a library can hold many).
export default function MediaThumb({ item, draggable }) {
  const kind = kindOf(item);
  if (kind === 'image') return <img src={item.url} alt="" loading="lazy" draggable={draggable} />;
  const Icon = kind === 'audio' ? Music : Film;
  const ext = String(item.name || '').split('.').pop().toUpperCase();
  return (
    <span className="cc-media-tile" data-kind={kind} aria-hidden="true">
      <Icon size={34} />
      <span className="cc-media-tile__ext">{ext}</span>
    </span>
  );
}
