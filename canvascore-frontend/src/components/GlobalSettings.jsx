import React, { useState, useEffect } from 'react';
import { useDraftSync } from '../session/hooks';
import { useStore } from '../store/useStore';
import { PanelTop, PanelBottom, Edit3, Trash2, Save, Palette, Mail, Search, ShieldCheck, Settings2 } from 'lucide-react';
import { Button, Card, Field, Input, Select, Checkbox, PageHeader } from '../ui/kit';
import { notify } from '../ui/notify';
import { confirmDialog } from '../ui/dialog';

const DEFAULT_SETTINGS = { brandColor: '#3b82f6', fontFamily: 'Inter', adminEmail: '', emailFrom: '', emailSubject: '', siteSuffix: ' | My Site' };

export default function GlobalSettings() {
  const { setView, publishSiteAsync, setActivePage, setBlocks, setSelectedBlockId } = useStore();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  // Saving before the data arrives (or after it failed) would overwrite the site's data with defaults
  const [loadState, setLoadState] = useState('loading');
  // Local backup of unsaved work (see src/session/)
  const draft = useDraftSync('settings', settings);
  const [restoredAt, setRestoredAt] = useState(null);

  useEffect(() => {
    fetch('api.php?action=get_settings')
      .then(res => res.json())
      .then(data => {
        const server = { ...DEFAULT_SETTINGS, ...(data && typeof data === 'object' ? data : {}) };
        const pending = draft.loaded(server);            // unsaved local draft (expired session, refresh...)
        setSettings(pending ? pending.value : server);
        if (pending) setRestoredAt(pending.savedAt);
        setLoadState('ready');
      })
      .catch(() => { setLoadState('error'); notify('Could not load the options from the server. Reload the page before saving.', 'error'); });
  }, [draft]);

  const saveSettings = async () => {
    if (loadState !== 'ready') return;
    setIsSaving(true);
    try {
      const r = await fetch('api.php?action=save_settings', { method: 'POST', body: JSON.stringify(settings) });
      const saved = await r.json();
      if (!saved || !saved.success) {
        notify('Global options NOT saved: ' + ((saved && saved.message) || 'unexpected response') + '\nYour changes are still here and backed up on this device.', 'error');
        setIsSaving(false);
        return;
      }
      draft.saved(settings);
      setRestoredAt(null);
      const pub = await publishSiteAsync();
      if (pub && pub.success) notify('Global options saved and site updated.');
      else notify('Global options saved, but publishing the site had an issue.', 'error');
    } catch { notify('Error saving settings. Your changes are still here and backed up on this device.', 'error'); }
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
    } catch { notify('Could not open the ' + name + '.', 'error'); }
  };
  const deletePart = async (name) => {
    if (!(await confirmDialog({ title: `Delete the global ${name}?`, message: 'All its blocks are removed from every page. This cannot be undone.', confirmLabel: `Delete ${name}`, danger: true }))) return;
    try {
      await fetch('api.php?action=delete_part', { method: 'POST', body: JSON.stringify({ name }) });
      await publishSiteAsync();
      notify(`${name.charAt(0).toUpperCase() + name.slice(1)} deleted.`);
    } catch { notify('Delete failed.', 'error'); }
  };

  const set = (patch) => setSettings({ ...settings, ...patch });
  const FONTS = [['Inter', 'Inter (Clean, Modern)'], ['Roboto', 'Roboto (Google Standard)'], ['Poppins', 'Poppins (Soft, Web)'], ['Open Sans', 'Open Sans (Readable)'],
    ['Montserrat', 'Montserrat (Geometric)'], ['Lato', 'Lato (Elegant)'], ['Oswald', 'Oswald (High Impact)'], ['Playfair Display', 'Playfair Display (Elegant Serif)'],
    ['Raleway', 'Raleway (Thin, Chic)'], ['Ubuntu', 'Ubuntu (Tech)'], ['Lora', 'Lora (Editorial Serif)']];

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader icon={Settings2} title="Global Options" description="Settings that apply to the whole site. Saving also republishes the site."
        actions={<Button variant="primary" icon={Save} onClick={saveSettings} disabled={isSaving || loadState !== 'ready'} title={loadState === 'loading' ? 'Loading…' : loadState === 'error' ? 'Not loaded: reload the page' : undefined}>{isSaving ? 'Saving…' : loadState === 'loading' ? 'Loading…' : 'Save & Publish'}</Button>} />

      {restoredAt && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#0c4a6e', border: '1px solid #0369a1', borderRadius: 10, padding: '9px 13px', marginBottom: 16, fontSize: 13, color: '#e0f2fe' }}>
          <span><strong>Restored unsaved changes</strong> from {new Date(restoredAt).toLocaleString()}. They are <strong>not saved to the site yet</strong>: click Save &amp; Publish to keep them.</span>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!(await confirmDialog({ title: 'Discard the restored changes?', message: 'The options go back to their last saved version.', confirmLabel: 'Discard changes', danger: true }))) return;
            setSettings(draft.discard()); setRestoredAt(null);
          }}>Discard</Button>
        </div>
      )}

      <Card title="Brand & typography" icon={Palette} description="The brand color is used by buttons, links and the site color in the text editor.">
        <div className="ui-grid">
          <Field label="Primary brand color">
            <div className="ui-row" style={{ flexWrap: 'nowrap' }}>
              <input type="color" aria-label="Pick the brand color" value={settings.brandColor || '#3b82f6'} onChange={e => set({ brandColor: e.target.value })} style={{ width: 38, height: 34, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none', flexShrink: 0 }} />
              <Input type="text" value={settings.brandColor || '#3b82f6'} onChange={e => set({ brandColor: e.target.value })} />
            </div>
          </Field>
          <Field label="Primary font (Google Fonts)">
            <Select value={settings.fontFamily || 'Inter'} onChange={e => set({ fontFamily: e.target.value })} options={FONTS} />
          </Field>
        </div>
        <Checkbox label="Let the menu inherit the brand color on hover" checked={!!settings.menuInheritTheme} onChange={e => set({ menuInheritTheme: e.target.checked })} />
        <p className="ui-hint" style={{ margin: '4px 0 0 24px' }}>When off, the menu uses only its own colors set in the Menu Builder.</p>
      </Card>

      <Card title="Site identity & SEO" icon={Search} description="How the site appears in browser tabs, search engines and social shares.">
        <div className="ui-grid">
          <Field label="Site name"><Input value={settings.siteName || ''} onChange={e => set({ siteName: e.target.value })} placeholder="My Site" /></Field>
          <Field label="Site address (for sitemap & social)"><Input value={settings.siteUrl || ''} onChange={e => set({ siteUrl: e.target.value })} placeholder="https://www.example.com" /></Field>
          <Field label="Page title suffix" hint="Added to every page title in the browser tab. Leave empty for none.">
            <Input value={settings.siteSuffix !== undefined ? settings.siteSuffix : ' | My Site'} onChange={e => set({ siteSuffix: e.target.value })} placeholder=" | My Site" />
          </Field>
          <Field label="Favicon address"><Input value={settings.faviconUrl || ''} onChange={e => set({ faviconUrl: e.target.value })} placeholder="/uploads/favicon.png" /></Field>
          <Field label="Default social image (OG)"><Input value={settings.defaultOgImage || ''} onChange={e => set({ defaultOgImage: e.target.value })} placeholder="/uploads/og-default.png" /></Field>
        </div>
        <Checkbox label="Allow search engines to index the site (robots.txt)" checked={settings.robotsAllow !== false} onChange={e => set({ robotsAllow: e.target.checked })} />
      </Card>

      <Card title="Global header & footer" icon={PanelTop} description="Blocks shown at the top and bottom of every page, under or above the menu.">
        <div className="ui-grid">
          {[['header', PanelTop], ['footer', PanelBottom]].map(([name, Icon]) => (
            <div key={name} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 700, textTransform: 'capitalize' }}><Icon size={16} color="#38bdf8" aria-hidden="true" /> {name}</div>
              <Checkbox label="Enabled (shown on all pages)" checked={settings[`${name}Enabled`] !== false} onChange={e => set({ [`${name}Enabled`]: e.target.checked })} />
              <div className="ui-row" style={{ marginTop: 12 }}>
                <Button variant="primary" size="sm" icon={Edit3} onClick={() => editPart(name)} style={{ flex: 1 }}>Edit {name}</Button>
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => deletePart(name)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Form emails" icon={Mail} description="Where messages sent through the site's forms are delivered.">
        <Field label="Default receiving email (To)" hint="Used by forms that don't have their own receiving email.">
          <Input type="email" value={settings.adminEmail || ''} onChange={e => set({ adminEmail: e.target.value })} placeholder="admin@yoursite.com" />
        </Field>
        <div className="ui-grid">
          <Field label="Sender email (From)"><Input type="email" value={settings.emailFrom || ''} onChange={e => set({ emailFrom: e.target.value })} placeholder="noreply@yoursite.com" /></Field>
          <Field label="Default subject"><Input value={settings.emailSubject || ''} onChange={e => set({ emailSubject: e.target.value })} placeholder="New submission from your website" /></Field>
        </div>
      </Card>

      <Card title="Security" icon={ShieldCheck}>
        <Field label="Session timeout (minutes of inactivity)" hint="Between 5 and 720 (12 h). Working in the editor counts as activity. When it expires you are asked to sign in again and your unsaved work is kept.">
          <Input type="number" min="5" max="720" value={settings.sessionTimeoutMinutes ?? 30} onChange={e => set({ sessionTimeoutMinutes: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} style={{ maxWidth: 160 }} />
        </Field>
      </Card>
    </div>
  );
}
