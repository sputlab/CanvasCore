import React from 'react';
import { Sliders, PanelLeft, PanelRight } from 'lucide-react';
import { PanelAccordion, TxtF, NumF, ColorF } from '../fields';

// Content panel: SPLIT_CTA
function Side({ side, value, onChange }) {
  const v = value && typeof value === 'object' ? value : {};
  const patch = (p) => onChange({ ...v, ...p });
  return (
    <>
      <TxtF label="Icon (emoji)" value={v.icon} onChange={x => patch({ icon: x })} />
      <TxtF label="Title" value={v.title} onChange={x => patch({ title: x })} />
      <TxtF label="Text" value={v.text} onChange={x => patch({ text: x })} multiline rows={2} />
      <TxtF label="Button text (empty = no button)" value={v.buttonText} onChange={x => patch({ buttonText: x })} />
      <TxtF label="Button link" value={v.buttonUrl} onChange={x => patch({ buttonUrl: x })} placeholder="/page or https://…" />
      <ColorF label={`${side} background`} value={v.bg} onChange={x => patch({ bg: x })} />
      <ColorF label="Text color" value={v.color} onChange={x => patch({ color: x })} />
      <ColorF label="Button background" value={v.buttonBg} onChange={x => patch({ buttonBg: x })} />
      <ColorF label="Button text color" value={v.buttonColor} onChange={x => patch({ buttonColor: x })} />
    </>
  );
}

export default function SplitCtaPanel({ ctx }) {
  const { c, set } = ctx;
  return (
    <>
      <PanelAccordion title="Left Side" icon={PanelLeft} defaultOpen={true}>
        <Side side="Left" value={c.left} onChange={v => set('left', v)} />
      </PanelAccordion>
      <PanelAccordion title="Right Side" icon={PanelRight} defaultOpen={false}>
        <Side side="Right" value={c.right} onChange={v => set('right', v)} />
      </PanelAccordion>
      <PanelAccordion title="Split Layout" icon={Sliders} defaultOpen={false}>
        <NumF label="Gap px" value={c.gap ?? 16} onChange={v => set('gap', v)} min={0} max={48} />
        <NumF label="Corner radius px" value={c.radius ?? 16} onChange={v => set('radius', v)} min={0} max={40} />
      </PanelAccordion>
    </>
  );
}
