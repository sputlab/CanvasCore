import React from 'react';
import { Sliders, Users } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, SelF, ImgF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: TEAM
export default function TeamPanel({ ctx }) {
  const { c, set, pick, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  return (
    <>
      <PanelAccordion title="Team Members" icon={Users} defaultOpen={true}>
        {lstOf('members').map((m, i) => (
          <ItemCard key={i} title={m.name || `Member ${i + 1}`} index={i} total={lstOf('members').length} onMove={(d) => lstMove('members', i, d)} onRemove={() => lstRemove('members', i)}>
            <TxtF label="Name" value={m.name} onChange={v => lstPatch('members', i, { name: v })} />
            <TxtF label="Role" value={m.role} onChange={v => lstPatch('members', i, { role: v })} />
            <TxtF label="Short bio" value={m.bio} onChange={v => lstPatch('members', i, { bio: v })} multiline rows={2} />
            <ImgF label="Photo (empty = initials)" value={m.photo} onChange={v => lstPatch('members', i, { photo: v })} onPick={pick('team_photo', i)} />
            <TxtF label="Email" value={m.email} onChange={v => lstPatch('members', i, { email: v })} />
            <TxtF label="LinkedIn" value={m.linkedin} onChange={v => lstPatch('members', i, { linkedin: v })} placeholder="linkedin.com/in/…" />
            <TxtF label="X / Twitter" value={m.twitter} onChange={v => lstPatch('members', i, { twitter: v })} />
            <TxtF label="Website" value={m.website} onChange={v => lstPatch('members', i, { website: v })} />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('members', { name: 'New member', role: '', bio: '', photo: '', email: '', linkedin: '', twitter: '', website: '' })} style={lstAddBtn}>+ Add member</button>
      </PanelAccordion>
      <PanelAccordion title="Team Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Columns" value={c.columns || 0} onChange={v => set('columns', Number(v))} options={[[0, 'Auto'], [1, '1'], [2, '2'], [3, '3'], [4, '4']]} />
        <SelF label="Style" value={c.layout || 'card'} onChange={v => set('layout', v)} options={[['card', 'Cards'], ['minimal', 'Minimal']]} />
        <SelF label="Photo shape" value={c.photoShape || 'circle'} onChange={v => set('photoShape', v)} options={[['circle', 'Circle'], ['rounded', 'Rounded'], ['square', 'Square']]} />
      </PanelAccordion>
    </>
  );
}
