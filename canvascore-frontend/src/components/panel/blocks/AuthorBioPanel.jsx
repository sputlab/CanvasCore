import React from 'react';
import { Sliders, CircleUserRound, Link2 } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, SelF, ChkF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: AUTHOR_BIO
export default function AuthorBioPanel({ ctx }) {
  const { c, set, pickTo, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const links = lstOf('links');
  return (
    <>
      <PanelAccordion title="Author" icon={CircleUserRound} defaultOpen={true}>
        <TxtF label="Label (empty = none)" value={c.label} onChange={v => set('label', v)} placeholder="About the author" />
        <TxtF label="Name" value={c.name} onChange={v => set('name', v)} />
        <TxtF label="Role" value={c.role} onChange={v => set('role', v)} />
        <TxtF label="Bio" value={c.bio} onChange={v => set('bio', v)} multiline rows={3} />
        <ImgF label="Photo (empty = initials)" value={c.photo} onChange={v => set('photo', v)} onPick={pickTo({ key: 'photo' })} />
      </PanelAccordion>
      <PanelAccordion title="Author Links" icon={Link2} defaultOpen={false}>
        {links.map((l, i) => (
          <ItemCard key={i} title={l.label || `Link ${i + 1}`} index={i} total={links.length} onMove={(d) => lstMove('links', i, d)} onRemove={() => lstRemove('links', i)}>
            <TxtF label="Label" value={l.label} onChange={v => lstPatch('links', i, { label: v })} />
            <TxtF label="Address or email" value={l.url} onChange={v => lstPatch('links', i, { url: v })} placeholder="example.com or name@example.com" />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('links', { label: 'New link', url: '' })} style={lstAddBtn}>+ Add link</button>
      </PanelAccordion>
      <PanelAccordion title="Author Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Layout" value={c.layout || 'horizontal'} onChange={v => set('layout', v)} options={[['horizontal', 'Photo beside text'], ['centered', 'Centered']]} />
        <ChkF label="Show as a card" checked={c.boxed !== false} onChange={v => set('boxed', v)} />
      </PanelAccordion>
    </>
  );
}
