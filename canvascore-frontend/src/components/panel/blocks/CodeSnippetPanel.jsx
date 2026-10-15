import React from 'react';
import { Sliders, Code2 } from 'lucide-react';
import { PanelAccordion, TxtF, NumF, SelF, ChkF } from '../fields';

// Content panel: CODE_SNIPPET
export default function CodeSnippetPanel({ ctx }) {
  const { c, set } = ctx;
  return (
    <>
      <PanelAccordion title="Code" icon={Code2} defaultOpen={true}>
        <SelF label="Language" value={c.language || 'text'} onChange={v => set('language', v)} options={[['html', 'HTML'], ['css', 'CSS'], ['js', 'JavaScript'], ['json', 'JSON'], ['php', 'PHP'], ['shell', 'Shell'], ['text', 'Plain text (no colors)']]} />
        <TxtF label="File name (optional)" value={c.filename} onChange={v => set('filename', v)} placeholder="app.js" />
        <TxtF label="Code" value={c.code} onChange={v => set('code', v)} multiline rows={10} mono />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The code is shown as text, never run. Colors are added in the visitor's browser.</p>
      </PanelAccordion>
      <PanelAccordion title="Code Display" icon={Sliders} defaultOpen={false}>
        <SelF label="Theme" value={c.theme === 'light' ? 'light' : 'dark'} onChange={v => set('theme', v)} options={[['dark', 'Dark'], ['light', 'Light']]} />
        <NumF label="Text size px" value={c.fontSize ?? 14} onChange={v => set('fontSize', v)} min={11} max={20} />
        <NumF label="Maximum height px (0 = show everything)" value={c.maxHeight ?? 0} onChange={v => set('maxHeight', v)} min={0} max={1200} step={20} />
        <ChkF label="Line numbers" checked={c.lineNumbers === true} onChange={v => set('lineNumbers', v)} />
        <ChkF label="Copy button" checked={c.copyButton !== false} onChange={v => set('copyButton', v)} />
      </PanelAccordion>
    </>
  );
}
