import React from 'react';
import { Layout, Globe, FileEdit, Upload } from 'lucide-react';
import { PanelAccordion } from './fields';
import { labelStyle, inputStyle } from './helpers';
import { slugify, slugOwner, uniqueSlug } from '../../utils/slug';

// Page settings, shown when no block is selected: page info, URL, structure, SEO (and item fields for collection items).
export default function PageSettings({ ctx }) {
  const { activePage, updateActivePage, pages, collections, coverInputRef } = ctx;
  // Hide the draft suffix from the user in the UI to avoid confusion
  const displaySlug = activePage?.slug || '';
  // Pages and collections share the top-level URLs (collection items are checked by the server)
  const slugCtx = { pages, collections, pageId: activePage?.id, parentId: activePage?.parent_id };
  const slugTakenBy = activePage?.__item ? null : slugOwner(slugify(displaySlug), slugCtx);

  return (
    <div style={{ paddingBottom: '40px', color: '#f8fafc' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid #1e293b', background: '#0f172a', position: 'sticky', top: 0, zIndex: 10 }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', color: '#38bdf8' }}><FileEdit size={16} /> Page Settings</h3>
      </div>
      <div style={{ padding: '12px' }}>

        {activePage?.__item && (
          <PanelAccordion title="Item Settings" icon={FileEdit} defaultOpen={true}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={activePage.status || 'draft'} onChange={e => updateActivePage({ status: e.target.value })}>
              <option value="draft">Draft (not published)</option>
              <option value="published">Published</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', margin: '12px 0' }}>
              <input type="checkbox" checked={!!activePage.archived} onChange={e => updateActivePage({ archived: e.target.checked })} /> Archived (moved to the archive list)
            </label>

            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={activePage.date || ''} onChange={e => updateActivePage({ date: e.target.value })} />

            <label style={{ ...labelStyle, marginTop: '12px' }}>Cover image</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" style={{ ...inputStyle, flex: 1 }} value={activePage.cover_image || ''} onChange={e => updateActivePage({ cover_image: e.target.value })} placeholder="/uploads/cover.jpg" />
              <button onClick={() => coverInputRef.current && coverInputRef.current.click()} style={{ padding: '0 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Upload size={13} /></button>
              <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                const f = e.target.files[0]; e.target.value = ''; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                try { const r = await fetch('api.php?action=upload_media', { method: 'POST', body: fd }); const d = await r.json(); if (d.success && d.url) updateActivePage({ cover_image: d.url }); } catch { /* noop */ }
              }} />
            </div>
            {activePage.cover_image && <img src={activePage.cover_image} alt="" style={{ marginTop: '8px', width: '100%', borderRadius: '8px', display: 'block' }} />}

            <label style={{ ...labelStyle, marginTop: '12px' }}>Excerpt</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={activePage.excerpt || ''} onChange={e => updateActivePage({ excerpt: e.target.value })} placeholder="Short summary shown in lists" />
          </PanelAccordion>
        )}

        <PanelAccordion title="Page Info" icon={FileEdit} defaultOpen={!activePage?.__item}>
          <label style={labelStyle}>Internal Title</label>
          <input type="text" value={activePage?.title || ''} onChange={(e) => {
            const title = e.target.value;
            const published = ['published', 'modified'].includes(activePage?.status);
            const autoSlug = !activePage?._slugEdited && !published && !Number(activePage?.is_draft_copy);
            if (autoSlug) updateActivePage({ title, slug: activePage?.__item ? slugify(title) : uniqueSlug(title, slugCtx) });
            else updateActivePage({ title });
          }} style={inputStyle} />

          <label style={labelStyle}>URL (Slug)</label>
          <input type="text" value={displaySlug} onChange={(e) => {
            const cleanedSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            updateActivePage({ slug: cleanedSlug, _slugEdited: true });
          }} onBlur={(e) => updateActivePage({ slug: slugify(e.target.value), _slugEdited: true })} style={{ ...inputStyle, ...(slugTakenBy ? { borderColor: '#f87171' } : {}) }} aria-invalid={slugTakenBy ? true : undefined} />
          {slugTakenBy && (
            <p role="alert" style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#fca5a5' }}>
              /{slugify(displaySlug)}/ is already used by {slugTakenBy.label}{slugTakenBy.live
                ? '. Choose another slug: this page cannot be published with it.'
                : ' (a draft). Choose another slug: only one of the two pages could be published.'}
            </p>
          )}
        </PanelAccordion>

        <PanelAccordion title="Page Structure" icon={Layout} defaultOpen={false}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc', fontWeight: 'bold', marginBottom: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!Number(activePage?.is_home)} onChange={e => updateActivePage({ is_home: e.target.checked ? 1 : 0 })} style={{ width: '16px', height: '16px' }} />
            Set as Homepage (site root)
          </label>
          <p style={{ margin: '0 0 15px 0', fontSize: '11px', color: '#64748b' }}>The homepage is published at the site root (index.html), whatever its slug is.</p>
          <label style={labelStyle}>Page Layout</label>
          <select style={inputStyle} value={activePage?.layout || 'boxed'} onChange={e => updateActivePage({layout: e.target.value})}>
            <option value="boxed">Boxed (Centered)</option>
            <option value="full">Full Width</option>
          </select>
          {activePage?.layout !== 'full' && (
            <>
              <label style={labelStyle}>Maximum Width (e.g. 1200px or 90%)</label>
              <input type="text" style={inputStyle} value={activePage?.boxed_width || '1200px'} onChange={e => updateActivePage({boxed_width: e.target.value})} />
            </>
          )}
          <label style={labelStyle}>Background Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="color" value={activePage?.bg_color || '#ffffff'} onChange={e => updateActivePage({bg_color: e.target.value})} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }} />
            <input type="text" value={activePage?.bg_color || '#ffffff'} onChange={e => updateActivePage({bg_color: e.target.value})} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
          </div>
        </PanelAccordion>

        <PanelAccordion title="SEO & Meta Data" icon={Globe} defaultOpen={false}>
          <label style={labelStyle}>Meta Title</label>
          <input type="text" value={activePage?.seo_title || ''} onChange={e => updateActivePage({seo_title: e.target.value})} style={inputStyle} />
          <label style={labelStyle}>Meta Description</label>
          <textarea value={activePage?.seo_description || ''} onChange={e => updateActivePage({seo_description: e.target.value})} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
          <label style={{...labelStyle, marginTop: '12px'}}>Social Share Image (OG)</label>
          <input type="text" value={activePage?.seo_image || ''} onChange={e => updateActivePage({ seo_image: e.target.value })} placeholder="/uploads/share.png (optional)" style={inputStyle} />
        </PanelAccordion>
      </div>
    </div>
  );
}
