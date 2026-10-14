import React from 'react';
import { Sliders, Building2 } from 'lucide-react';
import { PanelAccordion, ItemCard, Fld, TxtF, NumF, SelF, ChkF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: LOGOS
export default function LogosPanel({ ctx }) {
  const { c, set, pick, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  return (
    <>
      <PanelAccordion title="Logos" icon={Building2} defaultOpen={true}>
        <TxtF label="Heading (optional)" value={c.title} onChange={v => set('title', v)} placeholder="Trusted by" />
        {lstOf('logos').map((lg, i) => (
          <ItemCard key={i} title={`Logo ${i + 1}`} index={i} total={lstOf('logos').length} onMove={(d) => lstMove('logos', i, d)} onRemove={() => lstRemove('logos', i)}>
            <ImgF label="Image" value={lg.src} onChange={v => lstPatch('logos', i, { src: v })} onPick={pick('logo_img', i)} />
            <TxtF label="Name (alt text)" value={lg.alt} onChange={v => lstPatch('logos', i, { alt: v })} />
            <TxtF label="Link (optional)" value={lg.href} onChange={v => lstPatch('logos', i, { href: v })} placeholder="https://…" />
          </ItemCard>
        ))}
        <button onClick={pick('logo_add')} style={{ ...lstAddBtn, marginBottom: '6px' }}>+ Add logo from media</button>
        <button onClick={() => lstAdd('logos', { src: '', alt: '', href: '' })} style={{ ...lstAddBtn, borderStyle: 'solid', borderWidth: '1px', color: '#94a3b8' }}>+ Add empty slot (paste URL)</button>
      </PanelAccordion>
      <PanelAccordion title="Logos Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Layout" value={c.layout || 'grid'} onChange={v => set('layout', v)} options={[['grid', 'Grid'], ['marquee', 'Scrolling strip']]} />
        {(c.layout || 'grid') === 'grid' && <SelF label="Columns" value={c.columns || 5} onChange={v => set('columns', Number(v))} options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => [n, String(n)])} />}
        {c.layout === 'marquee' && <>
          <Fld label={`Speed: one loop every ${c.speed ?? 30} s`}>
            <input type="range" min="10" max="120" step="5" aria-label="Loop duration in seconds" style={{ width: '100%', cursor: 'pointer', direction: 'rtl' }} value={c.speed ?? 30} onChange={e => set('speed', Number(e.target.value))} />
          </Fld>
          <SelF label="Direction" value={c.direction === 'right' ? 'right' : 'left'} onChange={v => set('direction', v)} options={[['left', 'Right to left'], ['right', 'Left to right']]} />
          <ChkF label="Fade the edges" checked={c.fade === true} onChange={v => set('fade', v)} />
        </>}
        <NumF label="Logo height px (20–120)" min={20} max={120} value={c.height ?? 48} onChange={v => set('height', v)} />
        <NumF label="Gap px (8–80)" min={8} max={80} value={c.gap ?? 40} onChange={v => set('gap', v)} />
        <ChkF label="Grayscale (color on hover)" checked={c.grayscale !== false} onChange={v => set('grayscale', v)} />
        {c.layout === 'marquee' && <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Pauses on hover; static for visitors who prefer reduced motion.</p>}
      </PanelAccordion>
    </>
  );
}
