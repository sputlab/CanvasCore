import React from 'react';
import { Sliders, Film, Type, MousePointerClick } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ChkF, ColorF, ImgF, FileF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: VIDEO_HERO
export default function VideoHeroPanel({ ctx }) {
  const { c, set, pickTo, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const buttons = lstOf('buttons');
  return (
    <>
      <PanelAccordion title="Background Video" icon={Film} defaultOpen={true}>
        <FileF label="Video file (MP4 or WebM)" value={c.video} onChange={v => set('video', v)} onPick={pickTo({ key: 'video', kind: 'video' })} kind="video" />
        <FileF label="Second format (optional, e.g. WebM)" value={c.video2} onChange={v => set('video2', v)} onPick={pickTo({ key: 'video2', kind: 'video' })} kind="video" />
        <ImgF label="Poster image (shown while loading, on phones and when motion is reduced)" value={c.poster} onChange={v => set('poster', v)} onPick={pickTo({ key: 'poster' })} />
        <ChkF label="Show a pause button" checked={c.showPause !== false} onChange={v => set('showPause', v)} />
        <ChkF label="Also play the video on phones (uses mobile data)" checked={c.mobileVideo === true} onChange={v => set('mobileVideo', v)} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The video plays muted and loops. Keep it short and light (a few MB): a heavy video slows the page. Visitors who prefer reduced motion see the poster and can press play. In the editor the poster is shown.</p>
      </PanelAccordion>
      <PanelAccordion title="Hero Text" icon={Type} defaultOpen={true}>
        <TxtF label="Title" value={c.title} onChange={v => set('title', v)} />
        <TxtF label="Subtitle" value={c.subtitle} onChange={v => set('subtitle', v)} multiline rows={2} />
      </PanelAccordion>
      <PanelAccordion title="Hero Buttons" icon={MousePointerClick} defaultOpen={false}>
        {buttons.map((b, i) => (
          <ItemCard key={i} title={b.text || `Button ${i + 1}`} index={i} total={buttons.length} onMove={(d) => lstMove('buttons', i, d)} onRemove={() => lstRemove('buttons', i)}>
            <TxtF label="Text" value={b.text} onChange={v => lstPatch('buttons', i, { text: v })} />
            <TxtF label="Link" value={b.url} onChange={v => lstPatch('buttons', i, { url: v })} placeholder="/page or https://…" />
            <SelF label="Style" value={b.style === 'secondary' ? 'secondary' : 'primary'} onChange={v => lstPatch('buttons', i, { style: v })} options={[['primary', 'Solid white'], ['secondary', 'Outline']]} />
          </ItemCard>
        ))}
        {buttons.length < 2 && <button onClick={() => lstAdd('buttons', { text: 'New button', url: '', style: 'primary' })} style={lstAddBtn}>+ Add button</button>}
      </PanelAccordion>
      <PanelAccordion title="Hero Layout" icon={Sliders} defaultOpen={false}>
        <NumF label="Height px (280–1000)" value={c.height ?? 560} onChange={v => set('height', v)} min={280} max={1000} step={20} />
        <SelF label="Text alignment" value={c.align === 'left' ? 'left' : 'center'} onChange={v => set('align', v)} options={[['center', 'Centered'], ['left', 'Left']]} />
        <ColorF label="Overlay color" value={c.overlay} onChange={v => set('overlay', v)} />
        <NumF label="Overlay strength % (0–90)" value={c.overlayOpacity ?? 55} onChange={v => set('overlayOpacity', v)} min={0} max={90} />
        <ColorF label="Text color" value={c.textColor} onChange={v => set('textColor', v)} />
      </PanelAccordion>
    </>
  );
}
