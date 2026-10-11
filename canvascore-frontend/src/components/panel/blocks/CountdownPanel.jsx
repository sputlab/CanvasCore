import React from 'react';
import { Sliders, Timer } from 'lucide-react';
import { PanelAccordion, Fld, TxtF, SelF, ChkF } from '../fields';
import { fldInput } from '../helpers';
import { UTC_OFFSETS } from '../constants';

// Content panel: COUNTDOWN
export default function CountdownPanel({ ctx }) {
  const { c, set } = ctx;
  return (
    <>
      <PanelAccordion title="Countdown" icon={Timer} defaultOpen={true}>
        <Fld label="Target date & time"><input type="datetime-local" style={fldInput} value={c.datetime || ''} onChange={e => set('datetime', e.target.value)} /></Fld>
        <SelF label="Time zone" value={c.utcOffset || 'local'} onChange={v => set('utcOffset', v)} options={UTC_OFFSETS.map(o => [o, o === 'local' ? "Visitor's local time" : 'UTC' + o])} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>A fixed UTC offset does not follow daylight-saving changes: pick the offset that applies on the target date.</p>
        <SelF label="When it ends" value={c.endAction || 'message'} onChange={v => set('endAction', v)} options={[['message', 'Show a message'], ['hide', 'Hide the block']]} />
        {(c.endAction || 'message') === 'message' && <TxtF label="Message" value={c.endMessage} onChange={v => set('endMessage', v)} placeholder="It's here!" />}
      </PanelAccordion>
      <PanelAccordion title="Countdown Display" icon={Sliders} defaultOpen={false}>
        <ChkF label="Show seconds" checked={c.showSeconds !== false} onChange={v => set('showSeconds', v)} />
        <ChkF label="Show the date under the numbers" checked={c.showDate !== false} onChange={v => set('showDate', v)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <TxtF label="Days label" value={c.labelDays} onChange={v => set('labelDays', v)} placeholder="Days" />
          <TxtF label="Hours label" value={c.labelHours} onChange={v => set('labelHours', v)} placeholder="Hours" />
          <TxtF label="Minutes label" value={c.labelMinutes} onChange={v => set('labelMinutes', v)} placeholder="Minutes" />
          <TxtF label="Seconds label" value={c.labelSeconds} onChange={v => set('labelSeconds', v)} placeholder="Seconds" />
        </div>
      </PanelAccordion>
    </>
  );
}
