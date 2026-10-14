import React from 'react';
import { Sliders, ScrollText } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: SCROLLYTELLING
export default function ScrollytellingPanel({ ctx }) {
  const { c, set, pickTo, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const steps = lstOf('steps');
  return (
    <>
      <PanelAccordion title="Story Steps" icon={ScrollText} defaultOpen={true}>
        {steps.map((st, i) => (
          <ItemCard key={i} title={st.title || `Step ${i + 1}`} index={i} total={steps.length} onMove={(d) => lstMove('steps', i, d)} onRemove={() => lstRemove('steps', i)}>
            <TxtF label="Title" value={st.title} onChange={v => lstPatch('steps', i, { title: v })} />
            <TxtF label="Text" value={st.text} onChange={v => lstPatch('steps', i, { text: v })} multiline rows={3} />
            <ImgF label="Image shown with this step" value={st.image} onChange={v => lstPatch('steps', i, { image: v })} onPick={pickTo({ list: 'steps', index: i, key: 'image', alt: 'alt' })} />
            {st.image && <TxtF label="Image alt text" value={st.alt} onChange={v => lstPatch('steps', i, { alt: v })} />}
          </ItemCard>
        ))}
        {steps.length < 12 && <button onClick={() => lstAdd('steps', { title: 'New step', text: '', image: '', alt: '' })} style={lstAddBtn}>+ Add step</button>}
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The image stays in view while the visitor scrolls, and changes with the step in the middle of the screen. Up to 12 steps. In the editor the first image is shown.</p>
      </PanelAccordion>
      <PanelAccordion title="Story Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Image side" value={c.side === 'right' ? 'right' : 'left'} onChange={v => set('side', v)} options={[['left', 'Left'], ['right', 'Right']]} />
        <SelF label="Image shape" value={c.ratio || '4 / 3'} onChange={v => set('ratio', v)} options={[['4 / 3', '4:3'], ['3 / 2', '3:2'], ['1 / 1', '1:1'], ['16 / 9', '16:9'], ['3 / 4', '3:4 (portrait)']]} />
        <NumF label="Distance from the top while sticky px" value={c.stickyTop ?? 80} onChange={v => set('stickyTop', v)} min={0} max={300} />
        <NumF label="Height of each step (% of the screen)" value={c.stepHeight ?? 70} onChange={v => set('stepHeight', v)} min={40} max={120} />
        <NumF label="Gap px" value={c.gap ?? 48} onChange={v => set('gap', v)} min={0} max={120} />
      </PanelAccordion>
    </>
  );
}
