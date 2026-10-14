import React from 'react';
import { Sliders, Share2 } from 'lucide-react';
import { PanelAccordion, TxtF, NumF, SelF, ChkF } from '../fields';

// The networks in the order they appear on the page (twin of the list in renderBlock.mjs / compiler.php)
const NETWORKS = [['facebook', 'Facebook'], ['x', 'X'], ['linkedin', 'LinkedIn'], ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['email', 'Email'], ['copy', 'Copy link'], ['print', 'Print'], ['share', 'Share (phone share sheet)']];

// Content panel: SHARE_BAR
export default function ShareBarPanel({ ctx }) {
  const { c, set } = ctx;
  const chosen = Array.isArray(c.networks) ? c.networks : [];
  const toggle = (id, on) => set('networks', NETWORKS.map(([n]) => n).filter((n) => (n === id ? on : chosen.includes(n))));
  return (
    <>
      <PanelAccordion title="Share Bar" icon={Share2} defaultOpen={true}>
        <TxtF label="Title (empty = none)" value={c.title} onChange={v => set('title', v)} />
        <TxtF label="Message (empty = the page title)" value={c.message} onChange={v => set('message', v)} />
        {NETWORKS.map(([id, label]) => <ChkF key={id} label={label} checked={chosen.includes(id)} onChange={v => toggle(id, v)} />)}
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The links use the address of the page the visitor is on. Nothing is loaded from the networks until a visitor clicks. The bar appears once the page has loaded.</p>
      </PanelAccordion>
      <PanelAccordion title="Share Style" icon={Sliders} defaultOpen={false}>
        <SelF label="Buttons" value={c.style === 'icons' ? 'icons' : 'buttons'} onChange={v => set('style', v)} options={[['buttons', 'Icon and name'], ['icons', 'Icon only']]} />
        <SelF label="Shape" value={c.shape || 'pill'} onChange={v => set('shape', v)} options={[['pill', 'Pill'], ['rounded', 'Rounded'], ['square', 'Square']]} />
        <SelF label="Colors" value={c.colors || 'brand'} onChange={v => set('colors', v)} options={[['brand', 'Network colors'], ['mono', 'White with border'], ['dark', 'Dark']]} />
        <NumF label="Button height px" value={c.size ?? 40} onChange={v => set('size', v)} min={28} max={64} />
        <SelF label="Alignment" value={c.align || 'left'} onChange={v => set('align', v)} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} />
      </PanelAccordion>
    </>
  );
}
