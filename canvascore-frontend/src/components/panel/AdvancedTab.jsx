import React from 'react';
import { MoveUp, Code, MousePointerClick, Repeat, Play } from 'lucide-react';
import { PanelAccordion, SelF } from './fields';
import { labelStyle, inputStyle } from './helpers';
import { REVEAL_ANIMATIONS, DURATIONS, DELAYS, HOVER_EFFECTS, LOOP_EFFECTS } from '../../render/effects.mjs';
import { previewEffects } from '../../editor/previewEffects';

// Advanced tab (every block): entrance animation, hover effect, looping motion and,
// for admins, CSS id/classes/custom CSS.
export default function AdvancedTab({ ctx }) {
  const { selectedBlock, handleContentChange, handleStyleChange, userRole } = ctx;
  const c = selectedBlock.content || {};
  const anim = REVEAL_ANIMATIONS.some(([v]) => v === selectedBlock.styles.animation) ? selectedBlock.styles.animation : 'none';
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>

    <PanelAccordion title="Entrance Animation" icon={MoveUp} defaultOpen={true}>
      <SelF label="When the block scrolls into view" value={anim} onChange={v => handleStyleChange('animation', v)} options={REVEAL_ANIMATIONS} />
      {anim !== 'none' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <SelF label="Speed" value={c.animDuration || ''} onChange={v => handleContentChange('animDuration', v)} options={DURATIONS} />
          <SelF label="Delay" value={String(c.animDelay ?? '')} onChange={v => handleContentChange('animDelay', v)} options={DELAYS} />
        </div>
      )}
      <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>Tip: give blocks side by side growing delays (0.1s, 0.2s, 0.3s) so they appear one after the other.</p>
    </PanelAccordion>

    <PanelAccordion title="Hover Effect" icon={MousePointerClick} defaultOpen={false}>
      <SelF label="When the mouse is over the block" value={c.hoverEffect || ''} onChange={v => handleContentChange('hoverEffect', v)} options={HOVER_EFFECTS} />
      <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>Works in the canvas too: point at the block to try it. Buttons have their own hover settings in the Content tab.</p>
    </PanelAccordion>

    <PanelAccordion title="Looping Motion" icon={Repeat} defaultOpen={false}>
      <SelF label="Keeps moving gently" value={c.loopEffect || ''} onChange={v => handleContentChange('loopEffect', v)} options={LOOP_EFFECTS} />
      <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>Best on small things (an icon, a badge, a button). It starts after the entrance animation. Visitors who turn off motion in their system settings don't see any of these effects.</p>
    </PanelAccordion>

    {(anim !== 'none' || c.loopEffect) && (
      <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" style={{ marginTop: 4 }} onClick={() => previewEffects(selectedBlock)}>
        <Play size={13} aria-hidden="true" /> Preview animation
      </button>
    )}

    {userRole === 'admin' && (
    <PanelAccordion title="Custom Code" icon={Code} defaultOpen={false}>
      <label style={labelStyle}>CSS ID (Unique)</label>
      <input type="text" value={selectedBlock.content.customId || ''} onChange={e => handleContentChange('customId', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} style={inputStyle} placeholder="e.g. my-hero-section" />

      <label style={labelStyle}>CSS Classes (Space separated)</label>
      <input type="text" value={selectedBlock.content.customClass || ''} onChange={e => handleContentChange('customClass', e.target.value)} style={inputStyle} placeholder="e.g. shadow-lg text-center" />

      <label style={labelStyle}>Custom CSS</label>
      <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#94a3b8' }}>Use <strong style={{color:'#38bdf8'}}>__THIS__</strong> to target this specific element.</p>
      <textarea rows="6" value={selectedBlock.content.customCss || ''} onChange={e => handleContentChange('customCss', e.target.value)} style={{...inputStyle, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre', color: '#a78bfa'}} placeholder="__THIS__ {\n  filter: blur(5px);\n  transform: rotate(2deg);\n}" />
    </PanelAccordion>
    )}
  </div>
  );
}
