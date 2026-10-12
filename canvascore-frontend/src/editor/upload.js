// Uploads one image to the media library and reports its progress (0..1).
// XMLHttpRequest is used because fetch can't report upload progress; it sends the same CSRF token as the
// fetch guard. If the server answers 401/403 (session expired or token to refresh) the upload is retried
// once through fetch, whose guard handles sign-in again and the token refresh.
const token = () => {
  if (typeof window === 'undefined') return '';
  if (window.__CC_CSRF) return window.__CC_CSRF;
  const m = (document.cookie || '').match(/(?:^|;\s*)cc_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

const viaFetch = async (form) => {
  const res = await fetch('api.php?action=upload_media', { method: 'POST', body: form });
  return res.json();
};

export function uploadImage(file, { folder = '', onProgress = () => {} } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (folder) form.append('folder', folder);
  if (typeof XMLHttpRequest === 'undefined') return viaFetch(form).finally(() => onProgress(1));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'api.php?action=upload_media');
    const t = token();
    if (t) xhr.setRequestHeader('X-CSRF-Token', t);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.min(0.99, e.loaded / e.total)); };
    xhr.onload = () => {
      if (xhr.status === 401 || xhr.status === 403) { viaFetch(form).then(resolve, reject); return; }
      onProgress(1);
      try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({ success: false, message: `Unexpected answer from the server (${xhr.status}).` }); }
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(form);
  });
}
