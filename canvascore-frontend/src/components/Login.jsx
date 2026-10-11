import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Lock, LogIn, Clock } from 'lucide-react';
import { readExpiredNotice, clearExpiredNotice } from '../session/drafts';

export default function Login() {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Se la sessione e' scaduta e la pagina e' stata ricaricata, lo si dice chiaramente.
  const notice = useMemo(() => readExpiredNotice(), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(username, password);
      if (!res.success) setError(res.message || 'Authentication error');
      else clearExpiredNotice();
    } catch {
      setError('Server connection error');
    }

    setLoading(false);
  };

  const inputStyle = { width: '100%', padding: '12px 15px', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: '#1e293b', padding: '40px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px', border: '1px solid #334155' }}>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ background: '#3b82f6', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.5)' }}>
            <Lock size={32} color="#fff" />
          </div>
          <h2 style={{ color: '#f8fafc', margin: '0 0 8px 0', fontSize: '24px' }}>CanvasCore</h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Enter your credentials to manage the site</p>
        </div>

        {notice && (
          <div role="status" style={{ display: 'flex', gap: '10px', background: '#451a03', border: '1px solid #92400e', borderRadius: '10px', padding: '11px 13px', marginBottom: '22px', fontSize: '13px', color: '#fde68a', lineHeight: 1.5 }}>
            <Clock size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Your session expired.</strong> Unsaved changes{notice.user ? <> of <strong>{notice.user}</strong></> : ''} are backed up on this device and will be offered after you sign in.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>USERNAME</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. admin" required style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', background: '#450a0a', padding: '10px', borderRadius: '6px', border: '1px solid #7f1d1d' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer', transition: 'background 0.2s' }}>
            {loading ? 'Please wait...' : 'Login'} {!loading && <LogIn size={18} />}
          </button>
        </form>

      </div>
    </div>
  );
}
