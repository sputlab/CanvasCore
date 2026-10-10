import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, Inbox, Download, Trash2, RefreshCw } from 'lucide-react';

export default function Submissions() {
  const { setView } = useStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('api.php?action=get_submissions')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const exportCsv = async () => {
    try {
      const res = await fetch('api.php?action=export_submissions');
      const data = await res.json();
      if (!data.success) return;
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `form-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { alert('Export failed.'); }
  };

  const deleteOne = async (id) => {
    await fetch('api.php?action=delete_submission', { method: 'POST', body: JSON.stringify({ id }) });
    setRows(rows.filter(r => r.id !== id));
  };

  const clearAll = async () => {
    if (!window.confirm('Delete ALL submissions? This cannot be undone.')) return;
    await fetch('api.php?action=clear_submissions', { method: 'POST', body: '{}' });
    setRows([]);
  };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc' }}>
      <button onClick={() => setView('manager')} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0, marginBottom: '20px' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Inbox size={24} color="#38bdf8" /> Form Submissions <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 400 }}>({rows.length})</span>
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={load} style={btn('#334155')}><RefreshCw size={15} /> Refresh</button>
          <button onClick={exportCsv} disabled={!rows.length} style={btn('#3b82f6')}><Download size={15} /> Export CSV</button>
          <button onClick={clearAll} disabled={!rows.length} style={btn('#450a0a', '#fca5a5', '#7f1d1d')}><Trash2 size={15} /> Clear</button>
        </div>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Loading…</p> : rows.length === 0 ? (
        <div style={{ background: '#1e293b', border: '2px dashed #334155', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <Inbox size={40} style={{ marginBottom: '12px' }} />
          <p>No submissions yet. They will appear here when visitors send a form.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rows.map(r => (
            <div key={r.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{r.created_at} · <span style={{ color: '#38bdf8' }}>{r.form_id || 'form'}</span></span>
                <button onClick={() => deleteOne(r.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {Object.entries(r.data || {}).map(([k, v]) => (
                  <div key={k} style={{ background: '#0f172a', borderRadius: '8px', padding: '8px 12px' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{k}</div>
                    <div style={{ fontSize: '13px', color: '#f8fafc', wordBreak: 'break-word' }}>{String(v)}</div>
                  </div>
                ))}
              </div>
              {r.page && <div style={{ marginTop: '8px', fontSize: '11px', color: '#475569' }}>from: {r.page}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btn = (bg, color = '#f8fafc', border) => ({
  display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: bg, color,
  border: border ? `1px solid ${border}` : '1px solid #475569', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
});
