import React from 'react';
import { Sliders, Calculator, Coins, ToggleLeft, Plus } from 'lucide-react';
import { PanelAccordion, ItemCard, TxtF, NumF, SelF, ChkF, ColorF } from '../fields';
import { lstAddBtn } from '../helpers';

// Content panel: PRICE_CALCULATOR
export default function PriceCalculatorPanel({ ctx }) {
  const { c, set, lstOf, lstPatch, lstRemove, lstAdd, lstMove } = ctx;
  const sliders = lstOf('sliders');
  const addons = lstOf('addons');
  return (
    <>
      <PanelAccordion title="Calculator Texts" icon={Calculator} defaultOpen={true}>
        <TxtF label="Title (empty = none)" value={c.title} onChange={v => set('title', v)} />
        <TxtF label="Introduction (empty = none)" value={c.intro} onChange={v => set('intro', v)} multiline rows={2} />
        <TxtF label="Total label" value={c.totalLabel} onChange={v => set('totalLabel', v)} placeholder="Estimated total" />
        <TxtF label="Button text (empty = no button)" value={c.buttonText} onChange={v => set('buttonText', v)} />
        <TxtF label="Button link" value={c.buttonUrl} onChange={v => set('buttonUrl', v)} placeholder="/contact or https://…" />
        <TxtF label="Note under the button" value={c.note} onChange={v => set('note', v)} multiline rows={2} />
      </PanelAccordion>
      <PanelAccordion title="Prices" icon={Coins} defaultOpen={true}>
        <TxtF label="Currency symbol" value={c.currency} onChange={v => set('currency', v)} placeholder="€" />
        <SelF label="Symbol position" value={c.currencyPos === 'after' ? 'after' : 'before'} onChange={v => set('currencyPos', v)} options={[['before', 'Before the amount (€125)'], ['after', 'After the amount (125 €)']]} />
        <SelF label="Number format" value={c.numberFormat === 'eu' ? 'eu' : 'en'} onChange={v => set('numberFormat', v)} options={[['en', '1,234.56'], ['eu', '1.234,56']]} />
        <SelF label="Decimals" value={c.decimals ?? 0} onChange={v => set('decimals', Number(v))} options={[[0, 'None'], [1, '1'], [2, '2']]} />
        <NumF label="Fixed monthly price" value={c.basePrice ?? 0} onChange={v => set('basePrice', v)} min={0} step={0.5} />
        <TxtF label="Name of the fixed price" value={c.baseLabel} onChange={v => set('baseLabel', v)} placeholder="Base price" />
      </PanelAccordion>
      <PanelAccordion title="Sliders" icon={Sliders} defaultOpen={false}>
        {sliders.map((sl, i) => (
          <ItemCard key={i} title={sl.label || `Slider ${i + 1}`} index={i} total={sliders.length} onMove={(d) => lstMove('sliders', i, d)} onRemove={() => lstRemove('sliders', i)}>
            <TxtF label="Label" value={sl.label} onChange={v => lstPatch('sliders', i, { label: v })} />
            <TxtF label="Unit (e.g. people, GB)" value={sl.unit} onChange={v => lstPatch('sliders', i, { unit: v })} />
            <NumF label="Smallest value" value={sl.min ?? 0} onChange={v => lstPatch('sliders', i, { min: v })} />
            <NumF label="Largest value" value={sl.max ?? 100} onChange={v => lstPatch('sliders', i, { max: v })} />
            <NumF label="Step" value={sl.step ?? 1} onChange={v => lstPatch('sliders', i, { step: v })} min={0.01} step={0.5} />
            <NumF label="Starting value" value={sl.value ?? sl.min ?? 0} onChange={v => lstPatch('sliders', i, { value: v })} />
            <NumF label="Price per unit (per month)" value={sl.price ?? 0} onChange={v => lstPatch('sliders', i, { price: v })} min={0} step={0.1} />
            <NumF label="Units included for free" value={sl.included ?? 0} onChange={v => lstPatch('sliders', i, { included: v })} min={0} />
          </ItemCard>
        ))}
        {sliders.length < 6 && <button onClick={() => lstAdd('sliders', { label: 'New slider', unit: '', min: 0, max: 100, step: 1, value: 10, included: 0, price: 1 })} style={lstAddBtn}>+ Add slider</button>}
      </PanelAccordion>
      <PanelAccordion title="Add-ons" icon={Plus} defaultOpen={false}>
        {addons.map((ad, i) => (
          <ItemCard key={i} title={ad.label || `Add-on ${i + 1}`} index={i} total={addons.length} onMove={(d) => lstMove('addons', i, d)} onRemove={() => lstRemove('addons', i)}>
            <TxtF label="Label" value={ad.label} onChange={v => lstPatch('addons', i, { label: v })} />
            <NumF label="Price (per month)" value={ad.price ?? 0} onChange={v => lstPatch('addons', i, { price: v })} min={0} step={0.5} />
            <ChkF label="Ticked to begin with" checked={ad.checked === true} onChange={v => lstPatch('addons', i, { checked: v })} />
          </ItemCard>
        ))}
        {addons.length < 8 && <button onClick={() => lstAdd('addons', { label: 'New add-on', price: 10, checked: false })} style={lstAddBtn}>+ Add add-on</button>}
      </PanelAccordion>
      <PanelAccordion title="Monthly / Yearly" icon={ToggleLeft} defaultOpen={false}>
        <ChkF label="Let visitors switch between monthly and yearly" checked={c.billingToggle === true} onChange={v => set('billingToggle', v)} />
        {c.billingToggle === true && <>
          <SelF label="Shown first" value={c.defaultBilling === 'yearly' ? 'yearly' : 'monthly'} onChange={v => set('defaultBilling', v)} options={[['monthly', 'Monthly'], ['yearly', 'Yearly']]} />
          <NumF label="Discount for paying yearly (%)" value={c.yearlyDiscount ?? 0} onChange={v => set('yearlyDiscount', v)} min={0} max={90} />
          <TxtF label="Monthly button text" value={c.monthlyLabel} onChange={v => set('monthlyLabel', v)} placeholder="Monthly" />
          <TxtF label="Yearly button text" value={c.yearlyLabel} onChange={v => set('yearlyLabel', v)} placeholder="Yearly" />
          <TxtF label="Saving message ({amount} is replaced)" value={c.saveText} onChange={v => set('saveText', v)} placeholder="You save {amount} a year" />
        </>}
        <TxtF label="Word for a month" value={c.periodMonth} onChange={v => set('periodMonth', v)} placeholder="month" />
        <TxtF label="Word for a year" value={c.periodYear} onChange={v => set('periodYear', v)} placeholder="year" />
        <SelF label="Style" value={c.layout === 'plain' ? 'plain' : 'card'} onChange={v => set('layout', v)} options={[['card', 'Card'], ['plain', 'Plain']]} />
        <ColorF label="Accent color (empty = brand color)" value={c.accent} onChange={v => set('accent', v)} />
        <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>Prices are entered per month. The yearly total is 12 months minus the discount.</p>
      </PanelAccordion>
    </>
  );
}
