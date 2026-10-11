import React from 'react';
import { SeparatorHorizontal } from 'lucide-react';
import { PanelAccordion, NumF, SelF, ChkF, ColorF } from '../fields';

// Content panel: DIVIDER
export default function DividerPanel({ ctx }) {
  const { c, set } = ctx;
  const shape = ['wave', 'curve', 'diagonal'].includes(c.style);
  const line = ['line', 'gradient'].includes(c.style || 'line');
  return (
    <PanelAccordion title="Divider" icon={SeparatorHorizontal} defaultOpen={true}>
      <SelF label="Style" value={c.style || 'line'} onChange={v => set('style', v)} options={[['line', 'Line'], ['gradient', 'Gradient line'], ['dots', 'Dots'], ['wave', 'Wave'], ['curve', 'Curve'], ['diagonal', 'Diagonal'], ['spacer', 'Spacer (empty space)']]} />
      {c.style !== 'spacer' && <ColorF label="Color" value={c.color} onChange={v => set('color', v)} />}
      {(line || c.style === 'dots') && <NumF label="Thickness / size (1–20)" min={1} max={20} value={c.thickness ?? 2} onChange={v => set('thickness', v)} />}
      {line && <NumF label="Width % (10–100)" min={10} max={100} value={c.width ?? 100} onChange={v => set('width', v)} />}
      {(shape || c.style === 'spacer') && <NumF label="Height px (10–400)" min={10} max={400} value={c.height ?? 80} onChange={v => set('height', v)} />}
      {shape && <ChkF label="Flip vertically (use at the bottom of a section)" checked={c.flip} onChange={v => set('flip', v)} />}
      {shape && <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Tip: set the section above/below to the shape&apos;s color for a seamless transition.</p>}
    </PanelAccordion>
  );
}
