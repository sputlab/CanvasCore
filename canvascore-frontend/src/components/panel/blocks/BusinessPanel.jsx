import React from 'react';
import { Store, Clock } from 'lucide-react';
import { PanelAccordion, TxtF, SelF, ChkF } from '../fields';
import { lstAddBtn, fldInput } from '../helpers';
import { BUSINESS_TYPES, DEFAULT_HOURS } from '../constants';

// Content panel: BUSINESS
export default function BusinessPanel({ ctx }) {
  const { c, set, lstPatch } = ctx;
  const hours = Array.isArray(c.hours) ? c.hours : [];
  return (
    <>
      <PanelAccordion title="Business Details" icon={Store} defaultOpen={true}>
        <TxtF label="Business name" value={c.name} onChange={v => set('name', v)} />
        <SelF label="Business type (for Google)" value={c.businessType || 'LocalBusiness'} onChange={v => set('businessType', v)} options={BUSINESS_TYPES.map(b => [b, b])} />
        <TxtF label="Address (one line per row)" value={c.address} onChange={v => set('address', v)} multiline rows={3} />
        <TxtF label="Phone" value={c.phone} onChange={v => set('phone', v)} />
        <TxtF label="Email" value={c.email} onChange={v => set('email', v)} />
        <TxtF label="Website" value={c.website} onChange={v => set('website', v)} />
        <ChkF label="Show a “Get directions” button (Google Maps)" checked={c.mapsLink !== false} onChange={v => set('mapsLink', v)} />
        {c.mapsLink !== false && <TxtF label="Button text" value={c.directionsLabel} onChange={v => set('directionsLabel', v)} placeholder="Get directions" />}
      </PanelAccordion>
      <PanelAccordion title="Opening Hours" icon={Clock} defaultOpen={false}>
        {hours.length === 0 ? (
          <button onClick={() => set('hours', DEFAULT_HOURS)} style={lstAddBtn}>+ Add weekly hours</button>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px 74px 24px', gap: '4px', fontSize: '10px', color: '#64748b', fontWeight: 700 }}><span>DAY (label)</span><span>OPENS</span><span>CLOSES</span><span title="Closed">✕</span></div>
            {hours.map((hr, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 74px 74px 24px', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                <input type="text" style={fldInput} value={hr.day ?? ''} onChange={e => lstPatch('hours', i, { day: e.target.value })} />
                <input type="time" style={fldInput} value={hr.open || ''} disabled={!!hr.closed} onChange={e => lstPatch('hours', i, { open: e.target.value })} />
                <input type="time" style={fldInput} value={hr.close || ''} disabled={!!hr.closed} onChange={e => lstPatch('hours', i, { close: e.target.value })} />
                <input type="checkbox" title="Closed" checked={!!hr.closed} onChange={e => lstPatch('hours', i, { closed: e.target.checked })} />
              </div>
            ))}
            <button onClick={() => set('hours', [])} style={{ ...lstAddBtn, marginTop: '8px', borderStyle: 'solid', borderWidth: '1px', color: '#94a3b8' }}>Remove opening hours</button>
          </>
        )}
        <TxtF label="Section title" value={c.hoursTitle} onChange={v => set('hoursTitle', v)} placeholder="Opening hours" />
        <TxtF label="“Closed” text" value={c.closedLabel} onChange={v => set('closedLabel', v)} placeholder="Closed" />
        <TxtF label="Note (optional)" value={c.note} onChange={v => set('note', v)} placeholder="Closed on public holidays" />
        <ChkF label="Add structured data for Google (LocalBusiness)" checked={c.jsonLd !== false} onChange={v => set('jsonLd', v)} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Day labels can be in any language; Google always receives the standard day names, in order Monday → Sunday.</p>
      </PanelAccordion>
    </>
  );
}
