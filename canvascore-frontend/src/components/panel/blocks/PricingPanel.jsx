import React from 'react';
import { Sliders, CreditCard } from 'lucide-react';
import { PanelAccordion, ItemCard } from '../fields';
import { lstAddBtn, labelStyle, inputStyle } from '../helpers';

// Content panel: PRICING
export default function PricingPanel({ ctx }) {
  const { selectedBlock, handleContentChange, pages, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  return (
    <>
      <PanelAccordion title="Pricing Plans" icon={CreditCard} defaultOpen={true}>
        {lstOf('plans').map((pl, idx) => (
          <ItemCard key={idx} title={`Plan ${idx + 1}${pl.highlighted ? ' ★' : ''}`} index={idx} total={lstOf('plans').length} onMove={(d) => lstMove('plans', idx, d)} onRemove={() => lstRemove('plans', idx)}>
            <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={pl.name || ''} onChange={e => lstPatch('plans', idx, { name: e.target.value })} placeholder="Plan name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <input type="text" style={inputStyle} value={pl.price || ''} onChange={e => lstPatch('plans', idx, { price: e.target.value })} placeholder="Price ($19)" />
              <input type="text" style={inputStyle} value={pl.period || ''} onChange={e => lstPatch('plans', idx, { period: e.target.value })} placeholder="/month" />
            </div>
            <input type="text" style={{ ...inputStyle, marginBottom: '6px' }} value={pl.description || ''} onChange={e => lstPatch('plans', idx, { description: e.target.value })} placeholder="Short description" />
            <textarea rows="4" style={{ ...inputStyle, marginBottom: '6px' }} value={(pl.features || []).join('\n')} onChange={e => lstPatch('plans', idx, { features: e.target.value.split('\n') })} placeholder="Features — one per line" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <input type="text" style={inputStyle} value={pl.buttonText || ''} onChange={e => lstPatch('plans', idx, { buttonText: e.target.value })} placeholder="Button text" />
              <input type="text" style={inputStyle} value={pl.buttonUrl || ''} onChange={e => lstPatch('plans', idx, { buttonUrl: e.target.value })} placeholder="URL or mailto:" />
            </div>
            <select style={{ ...inputStyle, marginBottom: '8px' }} value="" onChange={e => { if (e.target.value) lstPatch('plans', idx, { buttonUrl: e.target.value }); }}>
              <option value="">Link to a page…</option>
              {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>{p.title}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginBottom: '6px' }}>
              <input type="checkbox" checked={!!pl.highlighted} onChange={e => lstPatch('plans', idx, { highlighted: e.target.checked })} /> Highlight this plan
            </label>
            <input type="text" style={inputStyle} value={pl.badge || ''} onChange={e => lstPatch('plans', idx, { badge: e.target.value })} placeholder="Badge (e.g. Most popular) — empty = none" aria-label="Badge" />
          </ItemCard>
        ))}
        <button onClick={() => lstAdd('plans', { name: 'New plan', price: '$0', period: '/month', description: '', features: ['Feature one'], buttonText: 'Choose', buttonUrl: '#', highlighted: false, badge: '' })} style={lstAddBtn}>+ Add plan</button>
      </PanelAccordion>
      <PanelAccordion title="Pricing Layout" icon={Sliders} defaultOpen={false}>
        <label style={labelStyle}>Columns</label>
        <select style={inputStyle} value={selectedBlock.content.columns || 0} onChange={e => handleContentChange('columns', parseInt(e.target.value, 10))}>
          <option value={0}>Auto (one per plan)</option>
          <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
        </select>
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>The highlighted plan uses the brand color. On small screens plans stack in one column.</p>
      </PanelAccordion>
    </>
  );
}
