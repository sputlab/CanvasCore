// Global Options › Text styles: the site's named text presets (H1–H6, body, small, button). Each has a font, size,
// weight and line height; tablet and phone values override the desktop ones. Blocks pick a preset in the Style tab.
import React, { useState } from 'react';
import { Type, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Card, Segmented } from '../ui/kit';
import { normalizeTypography, typeValuesFor, cleanTypeValue, TYPE_PRESETS, TYPE_FONTS, TYPE_WEIGHTS } from '../render/typography.mjs';

export default function TextStylesCard({ settings, set }) {
  const [device, setDevice] = useState('desktop');
  const typo = normalizeTypography(settings);
  // The value of one property on the device being edited; '' removes the device's own value (it inherits again)
  const put = (id, prop, value) => {
    const cur = typo[id] || {};
    const part = device === 'desktop' ? { ...cur } : { ...cur, [device]: { ...(cur[device] || {}) } };
    const target = device === 'desktop' ? part : part[device];
    if (value) target[prop] = value; else delete target[prop];
    set({ typography: normalizeTypography({ typography: { ...typo, [id]: part } }) });
  };
  // What the device gets when it has no value of its own: the desktop one (tablet), the tablet one (phone)
  const inheritedFrom = device === 'mobile' ? 'tablet' : 'desktop';
  const inputStyle = { minWidth: 0 };
  return (
    <Card title="Text styles" icon={Type} description="The site's text: headings, body, small text and buttons. Tablet and phone values override the desktop ones. Blocks pick a preset in the Style tab, under Typography › Text style.">
      <Segmented block label="Edit text styles for" value={device} onChange={setDevice} options={[
        ['desktop', 'Desktop', Monitor, 'Desktop text styles'], ['tablet', 'Tablet', Tablet, 'Tablet text styles'], ['mobile', 'Phone', Smartphone, 'Phone text styles'],
      ]} />
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 110px) minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 0.8fr)', gap: 8, fontSize: 11, color: '#94a3b8' }}>
          <span>Preset</span><span>Font</span><span>Size</span><span>Weight</span><span>Line height</span>
        </div>
        {TYPE_PRESETS.map(([id, label]) => {
          const own = (device === 'desktop' ? typo[id] : (typo[id] || {})[device]) || {};
          const inherited = device === 'desktop' ? {} : typeValuesFor(typo[id], inheritedFrom);
          const key = (prop) => `${id}-${device}-${prop}-${own[prop] || ''}`;
          const numeric = (prop, ariaSuffix) => (
            <input className="ui-input" key={key(prop)} aria-label={`${label} ${ariaSuffix}`} defaultValue={own[prop] || ''} placeholder={inherited[prop] || 'Default'} style={inputStyle}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== '' && cleanTypeValue(prop, v) !== v) { e.target.value = own[prop] || ''; return; }   // not a size: keep the saved one
                if (v !== (own[prop] || '')) put(id, prop, v);
              }} />
          );
          return (
            <div key={id} className="cc-text-style" style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 110px) minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 0.8fr)', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
              <select className="ui-input" key={key('font')} aria-label={`${label} font`} value={own.font || ''} style={inputStyle}
                onChange={(e) => put(id, 'font', e.target.value)}>
                <option value="">{device === 'desktop' ? 'Site font' : `Inherited (${inherited.font || 'site font'})`}</option>
                {TYPE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              {numeric('size', 'size')}
              <select className="ui-input" key={key('weight')} aria-label={`${label} weight`} value={own.weight || ''} style={inputStyle}
                onChange={(e) => put(id, 'weight', e.target.value)}>
                <option value="">{inherited.weight ? `Inherited (${inherited.weight})` : 'Default'}</option>
                {TYPE_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              {numeric('lineHeight', 'line height')}
            </div>
          );
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.45 }}>
        Sizes are CSS lengths such as 2.5rem or 18px; line height is a number such as 1.2. Leave a field empty to use its default.
      </p>
    </Card>
  );
}
