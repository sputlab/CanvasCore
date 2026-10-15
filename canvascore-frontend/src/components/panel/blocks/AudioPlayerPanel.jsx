import React from 'react';
import { Sliders, Headphones } from 'lucide-react';
import { PanelAccordion, TxtF, SelF, ChkF, ColorF, ImgF, FileF } from '../fields';

// Content panel: AUDIO_PLAYER
export default function AudioPlayerPanel({ ctx }) {
  const { c, set, pickTo } = ctx;
  return (
    <>
      <PanelAccordion title="Audio" icon={Headphones} defaultOpen={true}>
        <FileF label="Audio file (MP3, M4A, OGG or WAV)" value={c.src} onChange={v => set('src', v)} onPick={pickTo({ key: 'src', kind: 'audio' })} kind="audio" />
        <TxtF label="Title (empty = none)" value={c.title} onChange={v => set('title', v)} />
        <TxtF label="Artist or show (empty = none)" value={c.artist} onChange={v => set('artist', v)} />
        <ImgF label="Cover image (optional)" value={c.cover} onChange={v => set('cover', v)} onPick={pickTo({ key: 'cover' })} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The file is only downloaded when a visitor presses play. Without JavaScript the browser's own player is used.</p>
      </PanelAccordion>
      <PanelAccordion title="Player Style" icon={Sliders} defaultOpen={false}>
        <SelF label="Style" value={c.layout === 'plain' ? 'plain' : 'card'} onChange={v => set('layout', v)} options={[['card', 'Card'], ['plain', 'Plain']]} />
        <ColorF label="Accent color (empty = brand color)" value={c.accent} onChange={v => set('accent', v)} />
        <ChkF label="Skip back / forward 15 seconds" checked={c.skip !== false} onChange={v => set('skip', v)} />
        <ChkF label="Playback speed button" checked={c.speed !== false} onChange={v => set('speed', v)} />
      </PanelAccordion>
    </>
  );
}
