import React from 'react';
import { Sliders, TrendingUp, Image as ImageIcon, Quote } from 'lucide-react';
import { PanelAccordion, TxtF, SelF, ColorF, ImgF } from '../fields';

// Content panel: CASE_STUDY
export default function CaseStudyPanel({ ctx }) {
  const { c, set, pickTo } = ctx;
  return (
    <>
      <PanelAccordion title="Case Study" icon={TrendingUp} defaultOpen={true}>
        <TxtF label="Client" value={c.client} onChange={v => set('client', v)} />
        <TxtF label="Headline metric" value={c.metric} onChange={v => set('metric', v)} placeholder="+240%" />
        <TxtF label="Metric label" value={c.metricLabel} onChange={v => set('metricLabel', v)} />
        <TxtF label="Title" value={c.title} onChange={v => set('title', v)} />
        <TxtF label="Story" value={c.text} onChange={v => set('text', v)} multiline rows={3} />
        <TxtF label="Link text (empty = no link)" value={c.linkText} onChange={v => set('linkText', v)} />
        <TxtF label="Link" value={c.linkUrl} onChange={v => set('linkUrl', v)} placeholder="/page or https://…" />
      </PanelAccordion>
      <PanelAccordion title="Case Study Quote" icon={Quote} defaultOpen={false}>
        <TxtF label="Quote (empty = none)" value={c.quote} onChange={v => set('quote', v)} multiline rows={2} />
        <TxtF label="Quote author" value={c.quoteAuthor} onChange={v => set('quoteAuthor', v)} />
      </PanelAccordion>
      <PanelAccordion title="Case Study Images" icon={ImageIcon} defaultOpen={false}>
        <ImgF label="Image (empty = none)" value={c.image} onChange={v => set('image', v)} onPick={pickTo({ key: 'image', alt: 'alt' })} />
        {c.image && <TxtF label="Image alt text" value={c.alt} onChange={v => set('alt', v)} />}
        <ImgF label="Client logo (optional)" value={c.logo} onChange={v => set('logo', v)} onPick={pickTo({ key: 'logo' })} />
      </PanelAccordion>
      <PanelAccordion title="Case Study Layout" icon={Sliders} defaultOpen={false}>
        <SelF label="Layout" value={c.layout || 'horizontal'} onChange={v => set('layout', v)} options={[['horizontal', 'Image beside text'], ['vertical', 'Image above text']]} />
        <ColorF label="Accent color (empty = brand color)" value={c.accent} onChange={v => set('accent', v)} />
      </PanelAccordion>
    </>
  );
}
