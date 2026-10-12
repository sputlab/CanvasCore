// Site branding in the admin: the site name and favicon set in Global Options (loaded by the store's
// fetchBranding) replace the default name and icon. <BrandLogo> (BrandLogo.jsx) shows the icon.
import { useEffect } from 'react';
import { useStore } from '../store/useStore';

// Address of the site's favicon as seen from the admin (which lives one folder below the site root):
// absolute addresses are used as they are, site-relative ones ("uploads/x.png") get "../".
export function brandIconUrl(u) {
  const v = String(u || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v)) return v;
  if (/^[A-Za-z0-9._-][A-Za-z0-9._/-]*$/.test(v)) return '../' + v.replace(/^\.\//, '');
  return '';
}

// Keeps the browser tab of the admin in step: "<site name> · Admin" and the site's favicon
export function useBrandingHead() {
  const { siteName, faviconUrl } = useStore((s) => s.branding);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = siteName ? `${siteName} · Admin` : 'CanvasCore';
    const url = brandIconUrl(faviconUrl);
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    if (!link.dataset.ccDefault) link.dataset.ccDefault = link.getAttribute('href') || '';
    if (url) { link.removeAttribute('type'); link.setAttribute('href', url); }
    else if (link.dataset.ccDefault) link.setAttribute('href', link.dataset.ccDefault);
  }, [siteName, faviconUrl]);
}
