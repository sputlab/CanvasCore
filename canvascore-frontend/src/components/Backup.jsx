import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { DatabaseBackup, Upload, Download, AlertTriangle } from 'lucide-react';
import { Button, Card, PageHeader } from '../ui/kit';
import { notify } from '../ui/notify';
import { confirmDialog } from '../ui/dialog';

// Whole-site backup (admin): export to a file, import from a file (replaces the content, keeps the accounts).
export default function Backup() {
  const { publishSiteAsync, refreshPages } = useStore();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const exportSite = async () => {
    try {
      const res = await fetch('api.php?action=export_site');
      if (!res.ok) { notify('Export not allowed (admin only).', 'error'); return; }
      const text = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      if (!parsed || parsed.canvascore !== true) { notify('Export failed: ' + ((parsed && parsed.message) || 'unexpected answer from the server'), 'error'); return; }
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `canvascore-site-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      notify('Backup downloaded.');
    } catch { notify('Export failed.', 'error'); }
  };

  const importSite = async (file) => {
    if (!file) return;
    if (!(await confirmDialog({ title: `Import "${file.name}"?`, message: 'This REPLACES all current pages, menu, settings, masters and templates (user accounts are kept).\n\nIt cannot be undone: export a backup first if you may need the current site.', confirmLabel: 'Replace the site', danger: true }))) return;
    setBusy(true);
    try {
      const text = await file.text();
      const res = await fetch('api.php?action=import_site', { method: 'POST', body: text });
      const data = await res.json();
      notify(data.message || (data.success ? 'Imported.' : 'Import failed.'), data.success ? 'success' : 'error');
      if (data.success) { await refreshPages(); await publishSiteAsync(); }
    } catch { notify('Import failed: invalid file.', 'error'); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader icon={DatabaseBackup} title="Backup" description="Save the whole site to a file, or restore it from one." />
      <Card title="Export" icon={Download} description="Downloads the pages, menu, settings, global header and footer, masters and templates as one JSON file. Collections and uploaded images are not included (the file lists the image names): copy the uploads folder separately.">
        <Button variant="primary" icon={Download} onClick={exportSite}>Download backup</Button>
      </Card>
      <Card title="Import" icon={Upload} description="Restores a backup file made with Export.">
        <p className="ui-hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#fcd34d', marginBottom: 14 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          Importing replaces all the current content of the site. User accounts are kept.
        </p>
        <Button variant="danger" icon={Upload} disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>{busy ? 'Importing…' : 'Import a backup file…'}</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => { importSite(e.target.files[0]); e.target.value = ''; }} />
      </Card>
    </div>
  );
}
