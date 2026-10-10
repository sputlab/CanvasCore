import React, { useState, useEffect } from 'react';
import { useDraftSync } from '../session/hooks';
import { useStore } from '../store/useStore';
import { PanelTop, PanelBottom, Edit3, Trash2 } from 'lucide-react';
import { ChevronLeft, Save, Palette, Mail, LayoutGrid, Globe } from 'lucide-react';

const DEFAULT_SETTINGS = { brandColor: '#3b82f6', fontFamily: 'Inter', adminEmail: '', emailFrom: '', emailSubject: '', siteSuffix: ' | My Site' };

export default function GlobalSettings() {
  const { setView, publishSiteAsync, setActivePage, setBlocks, setSelectedBlockId } = useStore();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  // Backup locale del lavoro non salvato (vedi src/session/)
  const draft = useDraftSync('settings', settings);
  const [restoredAt, setRestoredAt] = useState(null);

  useEffect(() => {
    fetch('api.php?action=get_settings')
      .then(res => res.json())
      .then(data => {
        const server = { ...DEFAULT_SETTINGS, ...(data && typeof data === 'object' ? data : {}) };
        const pending = draft.loaded(server);            // bozza locale non salvata (sessione scaduta, refresh...)
        setSettings(pending ? pending.value : server);
        if (pending) setRestoredAt(pending.savedAt);
      })
      .catch(console.error);
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const r = await fetch('api.php?action=save_settings', { method: 'POST', body: JSON.stringify(settings) });
      const saved = await r.json();
      if (!saved || !saved.success) {
        alert('Global options NOT saved: ' + ((saved && saved.message) || 'unexpected response') + '\nYour changes are still here and backed up on this device.');
        setIsSaving(false);
        return;
      }
      draft.saved(settings);
      setRestoredAt(null);
      const pub = await publishSiteAsync();
      alert(pub && pub.success ? "✅ Global options saved and site updated successfully!" : 'Global options saved, but publishing the site had an issue.');
    } catch(e) { alert("Error saving settings. Your changes are still here and backed up on this device."); }
    setIsSaving(false);
  };

  const editPart = async (name) => {
    try {
      const res = await fetch('api.php?action=get_parts');
      const parts = await res.json();
      setActivePage({ id: `part_${name}`, __part: name, title: name === 'header' ? 'Site Header (global)' : 'Site Footer (global)', layout: 'full', bg_color: '#ffffff', boxed_width: '1200px', seo_title: '', seo_description: '', status: 'part' });
      setBlocks(Array.isArray(parts[name]) ? parts[name] : []);
      setSelectedBlockId(null);
      setView('editor');
    } catch (e) { alert('Could not open ' + name); }
  };
  const deletePart = async (name) => {
    if (!window.confirm(`Delete the global ${name}? This removes all its blocks.`)) return;
    try {
      await fetch('api.php?action=delete_part', { method: 'POST', body: JSON.stringify({ name }) });
      await publishSiteAsync();
      alert(`${name.charAt(0).toUpperCase() + name.slice(1)} deleted.`);
    } catch (e) { alert('Delete failed.'); }
  };

  const inputStyle = { width: '100%', padding: '7px 9px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' };

  return (
    <div style={{ padding: '16px 22px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc', paddingBottom: '60px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <button onClick={() => setView('manager')} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', padding: 0, marginBottom: '10px' }}>
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={24} color="#38bdf8" /> Global Options
          </h2>
        </div>
        <button onClick={saveSettings} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save & Publish'}
        </button>
      </div>

      {restoredAt && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#0c4a6e', border: '1px solid #0369a1', borderRadius: '10px', padding: '9px 13px', marginBottom: '16px', fontSize: '13px', color: '#e0f2fe' }}>
          <span><strong>Restored unsaved changes</strong> from {new Date(restoredAt).toLocaleString()}. They are <strong>not saved to the site yet</strong>: click Save &amp; Publish to keep them.</span>
          <button onClick={() => {
            if (!window.confirm('Discard the restored changes and reload the saved options?')) return;
            setSettings(draft.discard()); setRestoredAt(null);
          }} style={{ background: 'transparent', color: '#bae6fd', border: '1px solid #0369a1', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>Discard</button>
        </div>
      )}

      <div style={{ display: 'grid', gap: '30px' }}>
        {/* STILE E BRAND */}
        <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Palette size={18} color="#f472b6"/> Visual & Brand</h3>
          <div>
            <label style={labelStyle}>Primary Brand Color</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="color" value={settings.brandColor || '#3b82f6'} onChange={e => setSettings({...settings, brandColor: e.target.value})} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }} />
              <input type="text" value={settings.brandColor || '#3b82f6'} onChange={e => setSettings({...settings, brandColor: e.target.value})} style={{...inputStyle, flex: 1}} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Primary Font (Google Fonts)</label>
            <select style={inputStyle} value={settings.fontFamily || 'Inter'} onChange={e => setSettings({...settings, fontFamily: e.target.value})}>
              <option value="Inter">Inter (Clean, Modern)</option>
              <option value="Roboto">Roboto (Google Standard)</option>
              <option value="Poppins">Poppins (Soft, Web)</option>
              <option value="Open Sans">Open Sans (Readable)</option>
              <option value="Montserrat">Montserrat (Geometric)</option>
              <option value="Lato">Lato (Elegant)</option>
              <option value="Oswald">Oswald (High Impact)</option>
              <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
              <option value="Raleway">Raleway (Thin, Chic)</option>
              <option value="Ubuntu">Ubuntu (Tech)</option>
              <option value="Lora">Lora (Editorial Serif)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Navigation Menu Theme</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!settings.menuInheritTheme} onChange={e => setSettings({...settings, menuInheritTheme: e.target.checked})} style={{ width: 18, height: 18 }} />
              Let the menu inherit the global brand color on hover
            </label>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>When off, the menu uses only its own colors set in the Menu Builder.</p>
          </div>
        </div>

        <h3 style={{ margin: '28px 0 14px 0', fontSize: '15px', borderTop: '1px solid #334155', paddingTop: '20px' }}>SEO & Publishing</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <div>
            <label style={labelStyle}>SITE URL (for sitemap & social)</label>
            <input type="text" value={settings.siteUrl || ''} onChange={e => setSettings({ ...settings, siteUrl: e.target.value })} placeholder="https://www.example.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>SITE NAME</label>
            <input type="text" value={settings.siteName || ''} onChange={e => setSettings({ ...settings, siteName: e.target.value })} placeholder="My Site" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>FAVICON URL</label>
            <input type="text" value={settings.faviconUrl || ''} onChange={e => setSettings({ ...settings, faviconUrl: e.target.value })} placeholder="/uploads/favicon.png" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>DEFAULT SOCIAL IMAGE (OG)</label>
            <input type="text" value={settings.defaultOgImage || ''} onChange={e => setSettings({ ...settings, defaultOgImage: e.target.value })} placeholder="/uploads/og-default.png" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.robotsAllow !== false} onChange={e => setSettings({ ...settings, robotsAllow: e.target.checked })} style={{ width: 18, height: 18 }} />
              Allow search engines to index the site (robots.txt)
            </label>
          </div>
        </div>

        <h3 style={{ margin: '28px 0 14px 0', fontSize: '15px', borderTop: '1px solid #334155', paddingTop: '20px' }}>Security</h3>
        <div style={{ maxWidth: '360px' }}>
          <label style={labelStyle}>SESSION TIMEOUT (MINUTES OF INACTIVITY)</label>
          <input type="number" min="5" max="720" value={settings.sessionTimeoutMinutes ?? 30} onChange={e => setSettings({ ...settings, sessionTimeoutMinutes: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} style={inputStyle} />
          <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>Between 5 and 720 (12 h). Working in the editor counts as activity. When it expires you are asked to sign in again and your unsaved work is kept.</p>
        </div>

        <h3 style={{ margin: '28px 0 14px 0', fontSize: '15px', borderTop: '1px solid #334155', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><PanelTop size={16} color="#38bdf8" /> Global Header & Footer</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {[['header', PanelTop], ['footer', PanelBottom]].map(([name, Icon]) => (
            <div key={name} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Icon size={16} color="#38bdf8" />
                <strong style={{ textTransform: 'capitalize' }}>{name}</strong>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', marginBottom: '12px' }}>
                <input type="checkbox" checked={settings[`${name}Enabled`] !== false} onChange={e => setSettings({ ...settings, [`${name}Enabled`]: e.target.checked })} style={{ width: 16, height: 16 }} />
                Enabled (shown on all pages)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => editPart(name)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}><Edit3 size={13} /> Edit</button>
                <button onClick={() => deletePart(name)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 11px', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}><Trash2 size={13} /> Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* SEO E SITO */}
        <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={18} color="#10b981"/> SEO & Identity</h3>
          <label style={labelStyle}>Site Title Suffix (e.g. " | My Site")</label>
          <input type="text" value={settings.siteSuffix !== undefined ? settings.siteSuffix : ' | My Site'} onChange={e => setSettings({...settings, siteSuffix: e.target.value})} style={inputStyle} placeholder="Leave empty for none" />
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>This will be automatically appended to every page title in the browser tab.</p>
        </div>

        {/* EMAIL BACKEND */}
        <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={18} color="#a78bfa"/> Form Mailer Configuration</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Default Receiving Email (To)</label>
            <input type="email" value={settings.adminEmail || ''} onChange={e => setSettings({...settings, adminEmail: e.target.value})} style={inputStyle} placeholder="admin@yoursite.com" />
            <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#64748b' }}>If a specific form doesn't have an email set, messages will be sent here.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Sender Email (From)</label>
              <input type="email" value={settings.emailFrom || ''} onChange={e => setSettings({...settings, emailFrom: e.target.value})} style={inputStyle} placeholder="noreply@yoursite.com" />
            </div>
            <div>
              <label style={labelStyle}>Default Subject</label>
              <input type="text" value={settings.emailSubject || ''} onChange={e => setSettings({...settings, emailSubject: e.target.value})} style={inputStyle} placeholder="New submission from your website" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
