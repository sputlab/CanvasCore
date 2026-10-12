// Shared helpers and styles for the property panel and its block panels.

// ↑/↓ in a size field: 12px → 13px, 1.5 → 1.6, 0.5rem → 0.6rem (keeps the unit, or no unit).
// Shift steps by 10 (whole numbers) or 1 (decimals). Values it can't read (e.g. "10px 20px") are left alone.
export const handleNumericKey = (e, val, onChange) => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const strVal = String(val ?? '').trim();
  if (strVal === '') { onChange(e.key === 'ArrowUp' ? '1px' : '0px'); return; }
  const match = strVal.match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
  if (!match) return;
  const decimals = (match[1].split('.')[1] || '').length;
  const step = (decimals ? 0.1 : 1) * (e.shiftKey ? 10 : 1);
  const next = parseFloat(match[1]) + (e.key === 'ArrowUp' ? step : -step);
  onChange(Number(next.toFixed(Math.max(decimals, 1))).toString() + match[2]);
};

// Styles of the classic fields (kept inline: the panels compose them with local tweaks)
export const labelStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px', marginTop: '8px', letterSpacing: '.3px' };
export const inputStyle = { width: '100%', padding: '7px 10px', border: '1px solid #334155', borderRadius: '6px', fontSize: '12.5px', backgroundColor: '#0f172a', color: '#f8fafc', boxSizing: 'border-box' };

// List blocks (Accordion, Tabs, Pricing, Gallery...)
export const lstIconBtn = (disabled) => ({ background: 'transparent', border: 'none', color: '#94a3b8', cursor: disabled ? 'default' : 'pointer', padding: '3px', display: 'flex', opacity: disabled ? 0.3 : 1 });
export const lstAddBtn = { width: '100%', padding: '8px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' };

// Fields of the newer block panels (Divider, Callout, Steps...)
export const fldInput = { width: '100%', padding: '6px 9px', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', backgroundColor: '#0f172a', color: '#f8fafc', boxSizing: 'border-box' };
export const fldLabel = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px', marginTop: '7px' };

export const findLiveBlock = (nodes, id) => {
  for (const n of nodes || []) {
    if (n.id === id) return n;
    if (n.children) { const r = findLiveBlock(n.children, id); if (r) return r; }
  }
  return null;
};
