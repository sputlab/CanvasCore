import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { LogIn, Clock } from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';
import { Button, Field, Input } from '../ui/kit';
import { readExpiredNotice, clearExpiredNotice } from '../session/drafts';

export default function Login() {
  const { login } = useStore();
  const siteName = useStore((s) => s.branding.siteName);
  const installed = useStore((s) => s.installed);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // If the session expired and the page was reloaded, say so clearly.
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

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #1e3a5f 0%, #0b1220 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', fontFamily: 'var(--ui-font)' }}>
      <main className="ui-card" style={{ padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <BrandLogo size={52} iconSize={26} radius={14} style={{ margin: '0 auto 14px' }} />
          <h1 style={{ color: '#f8fafc', margin: '0 0 6px', fontSize: 22, overflowWrap: 'anywhere' }}>{siteName || 'Sign in'}</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>Enter your credentials to manage the site</p>
        </div>

        {notice && (
          <div role="status" style={{ display: 'flex', gap: 10, background: '#451a03', border: '1px solid #92400e', borderRadius: 10, padding: '11px 13px', marginBottom: 20, fontSize: 13, color: '#fde68a', lineHeight: 1.5 }}>
            <Clock size={17} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span><strong>Your session expired.</strong> Unsaved changes{notice.user ? <> of <strong>{notice.user}</strong></> : ''} are backed up on this device and will be offered after you sign in.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Username"><Input value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" autoFocus style={{ minHeight: 40 }} /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={{ minHeight: 40 }} /></Field>
          {!installed && <p role="status" style={{ color: '#fde68a', fontSize: 13, textAlign: 'center', background: '#451a03', padding: 10, borderRadius: 6, border: '1px solid #b45309', margin: '4px 0 12px' }}>CanvasCore is not set up yet: open <a href="install.php" style={{ color: '#fde68a' }}>install.php</a> to create the administrator account.</p>}
          {error && <p role="alert" style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center', background: '#450a0a', padding: 10, borderRadius: 6, border: '1px solid #7f1d1d', margin: '4px 0 12px' }}>{error}</p>}
          <Button type="submit" variant="primary" size="lg" block disabled={loading} style={{ marginTop: 6 }}>
            {loading ? 'Please wait…' : <>Login <LogIn size={18} aria-hidden="true" /></>}
          </Button>
        </form>
      </main>
    </div>
  );
}
