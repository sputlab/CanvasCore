import React from 'react';
import { Sliders, MailPlus } from 'lucide-react';
import { PanelAccordion, TxtF, SelF, ChkF, ColorF } from '../fields';
import { labelStyle, inputStyle } from '../helpers';

// Content panel: NEWSLETTER
export default function NewsletterPanel({ ctx }) {
  const { c, set, userRole } = ctx;
  return (
    <>
      <PanelAccordion title="Newsletter Signup" icon={MailPlus} defaultOpen={true}>
        <TxtF label="Title (empty = none)" value={c.title} onChange={v => set('title', v)} />
        <TxtF label="Text (empty = none)" value={c.text} onChange={v => set('text', v)} multiline rows={2} />
        <TxtF label="Button text" value={c.buttonText} onChange={v => set('buttonText', v)} placeholder="Subscribe" />
        <TxtF label="Message after signing up" value={c.successMsg} onChange={v => set('successMsg', v)} placeholder="Thank you for subscribing!" />
        {userRole === 'admin' && <>
          <label style={labelStyle}>Receiving Email</label>
          <input type="email" style={inputStyle} value={c.email || ''} onChange={e => set('email', e.target.value)} placeholder="Leave blank for Global Email" />
        </>}
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Sign-ups are saved with the other form messages (Submissions) and emailed like any form. They are not sent to a mailing service: export them from Submissions.</p>
      </PanelAccordion>
      <PanelAccordion title="Fields" icon={Sliders} defaultOpen={false}>
        <TxtF label="Email field name (shown in Submissions)" value={c.emailLabel} onChange={v => set('emailLabel', v)} placeholder="Email" />
        <TxtF label="Email field hint (empty = the name)" value={c.placeholder} onChange={v => set('placeholder', v)} placeholder="Your email address" />
        <ChkF label="Ask for a name too" checked={c.askName === true} onChange={v => set('askName', v)} />
        {c.askName === true && <>
          <TxtF label="Name field name" value={c.nameLabel} onChange={v => set('nameLabel', v)} placeholder="Name" />
          <TxtF label="Name field hint (empty = the name)" value={c.namePlaceholder} onChange={v => set('namePlaceholder', v)} />
        </>}
        <TxtF label="Agreement text (empty = no checkbox)" value={c.consentText} onChange={v => set('consentText', v)} multiline rows={2} placeholder="I agree to receive emails…" />
      </PanelAccordion>
      <PanelAccordion title="Newsletter Style" icon={Sliders} defaultOpen={false}>
        <SelF label="Fields" value={c.formLayout === 'stacked' ? 'stacked' : 'inline'} onChange={v => set('formLayout', v)} options={[['inline', 'In one row'], ['stacked', 'One below the other']]} />
        <SelF label="Style" value={c.layout === 'plain' ? 'plain' : 'card'} onChange={v => set('layout', v)} options={[['card', 'Card'], ['plain', 'Plain']]} />
        <ColorF label="Accent color (empty = brand color)" value={c.accent} onChange={v => set('accent', v)} />
      </PanelAccordion>
    </>
  );
}
