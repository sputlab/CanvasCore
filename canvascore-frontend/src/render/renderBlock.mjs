// canvascore-frontend/src/render/renderBlock.mjs
// CANONICAL block renderer, in plain JS (no React/DOM dependency).
// It is the single rendering contract: it must produce the SAME HTML as compiler.php.
// Parity is checked automatically by tests/parity.mjs (npm run test:parity).
//
// Note: rich-text content (text/title/subtitle/items...) is passed through here
// AS IS. XSS sanitization happens server-side in the compiler; in the parity
// test the inner content is normalized, so it does not affect the comparison
// of structure and styles.

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mirrors the compiler's build_inline_style(): camelCase -> kebab, skips '' and 'animation'.
export function buildInlineStyle(styles) {
  if (!styles || typeof styles !== 'object') return '';
  let str = '';
  for (const k of Object.keys(styles)) {
    const v = styles[k];
    if (v === '' || v === null || v === undefined || k === 'animation') continue;
    const kebab = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    str += `${kebab}: ${escapeHtml(v)}; `;
  }
  return str;
}

function resolveInternalUrl(url) {
  if (!url) return '#';
  if (/^(?:f|ht)tps?:\/\//i.test(url) || url === '#') return url;
  if (url === 'index.html' || url === 'index/index.html' || url === 'home/index.html' || url === '/') {
    return '{{BASE_URL}}';
  }
  const clean = url.replace(/index\/index\.html|index\.html/g, '');
  return '{{BASE_URL}}' + clean.replace(/^\/+/, '');
}

// Canonical root of a block (single source shared editor<->compiler for containers).
// Returns tag + id + className + style (camelCase object, ready for React).
export function blockRoot(block) {
  const styles = block.styles || {};
  const content = block.content || {};
  const id = block.id ? String(block.id).replace(/[^a-zA-Z0-9_-]/g, '') : 'b_x';
  const innerId = content.customId ? String(content.customId).replace(/[^a-zA-Z0-9_-]/g, '') : id;
  const animClass = (styles.animation && styles.animation !== 'none') ? ` cc-reveal ${styles.animation}` : '';
  const innerClass = content.customClass ? ' ' + content.customClass : '';
  switch (block.type) {
    case 'SECTION':   return { tag: 'section', id: innerId, className: `cc-section${animClass}${innerClass}`, style: { ...styles } };
    case 'CONTAINER': return { tag: 'div', id: innerId, className: `cc-container${animClass}${innerClass}`, style: { ...styles } };
    case 'FLEX_ROW':  return { tag: 'div', id: innerId, className: `cc-flex-row${animClass}${innerClass}`, style: { ...styles } };
    case 'CSS_GRID': {
      const columns = content.columns ?? 2;
      const gap = content.gap ?? '20px';
      return { tag: 'div', id: innerId, className: `cc-css-grid${animClass}${innerClass}`, style: { ...styles, display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap, overflow: 'hidden' } };
    }
    default: return null;
  }
}

// URL for block links (mirror of the compiler's cc_block_url; mailto:/tel: left intact)
function resolveBlockUrl(url) {
  url = String(url ?? '').trim();
  if (url === '') return '#';
  if (url === '#' || /^(?:f|ht)tps?:\/\//i.test(url) || /^(?:mailto|tel):/i.test(url)) return url;
  if (url === 'index.html' || url === 'index/index.html' || url === 'home/index.html' || url === '/') return '{{BASE_URL}}';
  const clean = url.replace(/index\/index\.html|index\.html/g, '');
  return '{{BASE_URL}}' + clean.replace(/^\/+/, '');
}

function toInt(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

// ---- helpers shared by the "content" blocks (twins of cc_* in compiler.php) ----
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)|var\(--[a-zA-Z0-9-]+(?:,\s*[#0-9a-zA-Z.,%()\s-]+)?\))$/;
function ccColor(v, d) { v = String(v ?? '').trim(); if (v === '') return d; return COLOR_RE.test(v) ? v : d; }
const ccIsNum = (v) => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)));
function ccNum(v, min, max, d) { return ccIsNum(v) ? Math.max(min, Math.min(max, Number(v))) : d; }
function ccFmtNum(v, dec) {
  // Same explicit rounding as the PHP compiler (cc_fmt_num).
  v = Number(v);
  const m = 10 ** dec;
  let r = Math.floor(Math.abs(v) * m + 0.5 + 1e-9) / m;
  if (v < 0) r = -r;
  if (r === 0) r = 0;
  const parts = r.toFixed(dec).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
function ccExtUrl(v) {
  v = String(v ?? '').trim();
  if (v === '') return '';
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://' + v.replace(/^\/+/, '');
}
function ccLines(s) { return String(s ?? '').split(/\r\n|\r|\n/).map((l) => l.trim()).filter((l) => l !== ''); }
function ccBr(s) { return ccLines(s).map(escapeHtml).join('<br>'); }
function ccInitials(name) {
  return String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => [...p][0]).join('');
}
function ccEnc(s) { return encodeURIComponent(String(s ?? '')).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()); }

// opts.fields (editor canvas only): marks the rich text fields as editable in place
// (data-cc-field + contenteditable) on the same elements the site renders, so editing keeps the layout.
export function renderBlock(block, opts = {}) {
  if (!block || typeof block !== 'object') return '';
  const field = (name, placeholder) => (opts.fields ? ` data-cc-field="${name}" contenteditable="true" data-cc-placeholder="${placeholder}"` : '');

  const styles = block.styles || {};
  const content = block.content || {};
  const styleAttr = buildInlineStyle(styles);
  const styleString = styleAttr ? ` style="${styleAttr}"` : '';
  const animClass = (styles.animation && styles.animation !== 'none') ? ` cc-reveal ${styles.animation}` : '';

  const blockId = block.id ? String(block.id).replace(/[^a-zA-Z0-9_-]/g, '') : 'b_x';
  const innerId = content.customId ? String(content.customId).replace(/[^a-zA-Z0-9_-]/g, '') : blockId;
  const innerClass = content.customClass ? ' ' + escapeHtml(content.customClass) : '';

  let customCss = '';
  if (content.customCss) {
    let css = String(content.customCss).replace(/__THIS__/g, '#' + innerId);
    css = css.replace(/<\/\s*(style|script)/gi, '');
    customCss = `<style>\n${css}\n</style>\n`;
  }

  let childrenHtml = '';
  if (Array.isArray(block.children)) {
    for (const child of block.children) childrenHtml += renderBlock(child);
  }

  const t = block.type;
  let html = '';

  if (t === 'MASTER') {
    // Masters are resolved by the compiler via the DB; in the editor they are handled separately.
    return `<!-- Master: ${escapeHtml(content.name ?? '')} -->\n`;
  }

  switch (t) {
    case 'SECTION': {
      const r = blockRoot(block);
      return customCss + `<section id="${r.id}" class="${r.className}" style="${buildInlineStyle(r.style)}">\n${childrenHtml}\n</section>\n`;
    }

    case 'CONTAINER': {
      const r = blockRoot(block);
      return customCss + `<div id="${r.id}" class="${r.className}" style="${buildInlineStyle(r.style)}">\n${childrenHtml}\n</div>\n`;
    }

    case 'FLEX_ROW': {
      const r = blockRoot(block);
      return customCss + `<div id="${r.id}" class="${r.className}" style="${buildInlineStyle(r.style)}">\n${childrenHtml}\n</div>\n`;
    }

    case 'CSS_GRID': {
      const r = blockRoot(block);
      html = `<style>@media(max-width: 768px){ #${r.id} { grid-template-columns: 1fr !important; } }</style>`;
      html += `<div id="${r.id}" class="${r.className}" style="${buildInlineStyle(r.style)}">\n${childrenHtml}</div>\n`;
      return customCss + html;
    }

    case 'TEXT':
      return customCss + `<div id="${innerId}" class="cc-text${animClass}${innerClass}"${styleString}${field('text', 'Type your text…')}>\n${content.text ?? ''}\n</div>\n`;

    case 'IMAGE': {
      const src = escapeHtml(content.src ?? '');
      const alt = escapeHtml(content.alt ?? '');
      const fit = escapeHtml(content.objectFit ?? 'cover');
      const pos = escapeHtml(content.objectPosition ?? 'center');
      const scale = escapeHtml(content.scale ?? '1');
      const ar = content.aspectRatio ?? 'auto';
      const arStyle = (ar && ar !== 'auto') ? ` aspect-ratio:${escapeHtml(ar)};` : '';
      return customCss + `<figure id="${innerId}" class="cc-image${animClass}${innerClass}" style="${styleAttr} margin:0; overflow:hidden;${arStyle}"><img src="${src}" alt="${alt}" loading="lazy" style="width:100%; height:100%; object-fit:${fit}; object-position:${pos}; transform:scale(${scale}); display:block; border-radius:inherit;"></figure>\n`;
    }

    case 'BUTTON': {
      const url = escapeHtml(resolveInternalUrl(content.url ?? '#'));
      const text = escapeHtml(content.text ?? 'Click here');
      const align = escapeHtml(styles.textAlign ?? 'center');
      const margin = escapeHtml(styles.margin ?? '0');
      const useGlobal = content.useGlobal !== false;
      const own = { ...styles };
      delete own.margin; delete own.textAlign; delete own.animation;
      const globalStyle = useGlobal ? 'background: var(--brand-color, #3b82f6); color: #fff; border-radius: 6px; padding: 12px 24px; ' : '';
      const btnStyle = 'display:inline-block; text-decoration:none; font-weight:bold; box-sizing:border-box; ' + globalStyle + buildInlineStyle(own);
      return customCss + `<div id="${innerId}" class="cc-btn-wrap${animClass}${innerClass}" style="text-align:${align}; margin:${margin};">\n<a href="${url}" class="cc-btn" style="${btnStyle}">${text}</a>\n</div>\n`;
    }

    case 'GRID': {
      const columns = content.columns ?? 2;
      html = `<style>@media(max-width: 768px){ #${innerId} { grid-template-columns: 1fr !important; } }</style>`;
      html += `<div id="${innerId}" class="cc-grid ${animClass}${innerClass}" style="${styleAttr} display:grid; grid-template-columns:repeat(${columns}, 1fr); gap:20px; overflow:hidden;">\n`;
      if (Array.isArray(content.items)) for (const item of content.items) html += `  <div style="min-width:0;">\n${item}\n  </div>\n`;
      html += `</div>\n`;
      return customCss + html;
    }

    case 'HERO': {
      const bg = content.bgImage ? `background-image: url('${escapeHtml(content.bgImage)}'); background-size: cover; background-position: center;` : '';
      const title = content.title ?? '';
      const subtitle = content.subtitle ?? '';
      const minHeight = styles.minHeight ?? 'auto';
      let buttons = content.buttons ?? [];
      if (!buttons.length) buttons = [{ text: content.btnText ?? 'Start Now', url: content.btnUrl ?? '#', bgColor: 'var(--brand-color, #3b82f6)', textColor: '#ffffff', borderRadius: '8px' }];
      let buttonsHtml = `<div style="display:flex; gap:15px; flex-wrap:wrap; justify-content:${styles.textAlign ?? 'center'};">`;
      for (const btn of buttons) {
        const bUrl = escapeHtml(resolveInternalUrl(btn.url));
        buttonsHtml += `<a href="${bUrl}" style="display:inline-block; padding:14px 28px; background:${escapeHtml(btn.bgColor)}; color:${escapeHtml(btn.textColor)}; border-radius:${escapeHtml(btn.borderRadius)}; text-decoration:none; font-weight:bold; border:none; box-sizing:border-box;">${escapeHtml(btn.text)}</a>`;
      }
      buttonsHtml += `</div>`;
      return customCss + `<section id="${innerId}" class="cc-hero${animClass}${innerClass}" style="${styleAttr} ${bg} min-height:${minHeight}; display:flex; flex-direction:column; justify-content:center;">\n<div>\n${opts.fields ? `<div${field('title', 'Title')}>${title}</div>` : title}\n<div style="margin:20px 0;"${field('subtitle', 'Subtitle')}>${subtitle}</div>\n${buttonsHtml}\n</div>\n</section>\n`;
    }

    case 'IMAGE_TEXT': {
      const layout = (content.layout ?? 'img-left') === 'img-right' ? 'row-reverse' : 'row';
      const src = escapeHtml(content.src ?? '');
      const text = content.text ?? '';
      return customCss + `<section id="${innerId}" class="cc-img-text${animClass}${innerClass}" style="${styleAttr} display:flex; gap:40px; align-items:center; flex-direction:${layout}; flex-wrap:wrap;">\n<div style="flex:1 1 300px; width:100%;"><img src="${src}" style="width:100%; border-radius:8px; display:block;"></div>\n<div style="flex:1 1 300px; width:100%;"${field('text', 'Type your text…')}>${text}</div>\n</section>\n`;
    }

    case 'CARDS': {
      html = `<section id="${innerId}" class="cc-cards${animClass}${innerClass}" style="${styleAttr}">\n<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">\n`;
      if (Array.isArray(content.items)) for (const item of content.items) html += `<div style="background:#fff; padding:30px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.05); border:1px solid #e2e8f0; min-width:0;">${item}</div>\n`;
      html += `</div>\n</section>\n`;
      return customCss + html;
    }

    case 'VIDEO': {
      const url = content.url ?? '';
      let embed = '';
      const yt = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
      if (yt) embed = 'https://www.youtube.com/embed/' + yt[1];
      else { const vm = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i); if (vm) embed = 'https://player.vimeo.com/video/' + vm[1]; }
      if (!embed) return '';
      return customCss + `<div id="${innerId}" class="cc-video${animClass}${innerClass}"${styleString}>\n<div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:inherit;">\n<iframe src="${embed}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen loading="lazy"></iframe>\n</div>\n</div>\n`;
    }

    case 'ICON_BOX': {
      const icon = escapeHtml(content.icon ?? '\u26a1');
      const title = escapeHtml(content.title ?? '');
      const desc = escapeHtml(content.description ?? '');
      const align = escapeHtml(styles.textAlign ?? 'center');
      const ibOwn = { ...styles }; delete ibOwn.textAlign; delete ibOwn.animation;
      return customCss + `<div id="${innerId}" class="cc-icon-box${animClass}${innerClass}" style="${buildInlineStyle(ibOwn)}text-align:${align};">\n<div style="font-size:36px; margin-bottom:15px;">${icon}</div>\n<h3 style="margin:0 0 10px 0; font-size:18px;">${title}</h3>\n<p style="margin:0; font-size:14px; opacity:0.8;">${desc}</p>\n</div>\n`;
    }

    case 'TESTIMONIAL': {
      const quote = escapeHtml(content.quote ?? '');
      const author = escapeHtml(content.author ?? '');
      const role = escapeHtml(content.role ?? '');
      return customCss + `<div id="${innerId}" class="cc-testimonial${animClass}${innerClass}" style="${styleAttr}">\n<p style="font-size:16px; font-style:italic; margin:0 0 20px 0; line-height:1.6;">\u201c${quote}\u201d</p>\n<div style="font-weight:700; font-size:14px;">${author}</div>\n<div style="font-size:12px; opacity:0.6;">${role}</div>\n</div>\n`;
    }

    case 'SLIDER': {
      const effect = content.effect ?? 'slide';
      const isFade = effect === 'fade';
      const fit = escapeHtml(content.objectFit ?? 'cover');
      const opos = escapeHtml(content.objectPosition ?? 'center');
      const ar = escapeHtml(content.aspectRatio ?? '16 / 9');
      const hasHeight = styles.height && styles.height !== 'auto';
      const boxSize = hasHeight ? '' : ` aspect-ratio:${ar};`;
      html = `<div id="${innerId}" class="cc-slider${animClass}${innerClass}" style="${styleAttr} position:relative; overflow:hidden; border-radius:inherit;${boxSize}">\n`;
      html += `  <div class="cc-slides" style="display:flex; position:relative; height:100%; ${isFade ? '' : 'overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none;'}">\n`;
      if (Array.isArray(content.images)) {
        content.images.forEach((img, idx) => {
          const src = escapeHtml(img.src ?? '');
          const alt = escapeHtml(img.alt ?? '');
          if (isFade) {
            const opacity = idx === 0 ? 1 : 0;
            const pos = idx === 0 ? 'relative' : 'absolute';
            html += `    <img src="${src}" alt="${alt}" style="position:${pos}; top:0; left:0; width:100%; height:100%; object-fit:${fit}; object-position:${opos}; opacity:${opacity}; transition:opacity 0.8s ease; border-radius:inherit;" class="cc-slide">\n`;
          } else {
            html += `    <img src="${src}" alt="${alt}" style="flex:0 0 100%; width:100%; height:100%; scroll-snap-align:start; object-fit:${fit}; object-position:${opos}; border-radius:inherit;" class="cc-slide">\n`;
          }
        });
      }
      html += `  </div>\n</div>\n`;
      // note: the compiler's autoplay <style>/<script> does not affect structure/styles
      return customCss + html;
    }

    case 'MAPS': {
      const address = encodeURIComponent(content.address ?? '');
      const zoom = parseInt(content.zoom ?? 15, 10) || 15;
      return customCss + `<div id="${innerId}" class="cc-maps${animClass}${innerClass}" style="${styleAttr}">\n  <div style="position:relative; overflow:hidden; padding-bottom:56.25%; height:0; border-radius:inherit;">\n    <iframe src="https://maps.google.com/maps?q=${address}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen loading="lazy"></iframe>\n  </div>\n</div>\n`;
    }

    case 'FAQ': {
      let items = '';
      if (Array.isArray(content.items)) {
        for (const it of content.items) {
          const q = escapeHtml(it.q ?? '');
          const a = escapeHtml(it.a ?? '').replace(/\r\n|\r|\n/g, '<br />');
          items += `  <details style="margin-bottom:10px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">\n    <summary style="padding:15px 20px; font-weight:600; cursor:pointer; background:#f8fafc; outline:none; list-style:none;"><span style="display:inline-block; width:15px; font-weight:bold; color:var(--brand-color, #3b82f6);">+</span> ${q}</summary>\n    <div style="padding:15px 20px; border-top:1px solid #e2e8f0; font-size:15px; color:#475569; line-height:1.6;">${a}</div>\n  </details>\n`;
        }
      }
      return customCss + `<div id="${innerId}" class="cc-faq${animClass}${innerClass}" style="${styleAttr}">\n${items}</div>\n`;
    }

    case 'FORM': {
      const btnText = escapeHtml(content.btnText ?? 'Send Message');
      const successMsg = escapeHtml(content.successMsg ?? 'Sent!');
      const title = content.title ?? '<h3>Contact Us</h3>';
      const formId = content.customId
        ? 'f_' + String(content.customId).replace(/[^a-zA-Z0-9_-]/g, '')
        : 'f_' + String(block.id ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
      let fieldsHtml = '';
      const fields = Array.isArray(content.fields) ? content.fields : [{ label: 'Name', type: 'text', required: true }, { label: 'Email', type: 'email', required: true }, { label: 'Message', type: 'textarea', required: true }];
      fields.forEach((f, i) => {
        const fLabel = escapeHtml(f.label ?? '');
        const fType = f.type ?? 'text';
        const req = f.required ? 'required' : '';
        const name = 'field_' + i;
        fieldsHtml += `<input type="hidden" name="_label_${name}" value="${fLabel}">\n`;
        fieldsHtml += `<div style="margin-bottom:15px;"><label style="display:block; margin-bottom:5px; font-weight:600;">${fLabel}</label>`;
        if (fType === 'textarea') fieldsHtml += `<textarea name="${name}" ${req} rows="4" style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; background:#fff; box-sizing:border-box;"></textarea>`;
        else fieldsHtml += `<input type="${fType}" name="${name}" ${req} style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; background:#fff; box-sizing:border-box;">`;
        fieldsHtml += `</div>\n`;
      });
      return customCss + `<div id="${innerId}" class="cc-form-block${animClass}${innerClass}"${styleString}>\n<div style="margin-bottom:20px;"${field('title', 'Form title')}>${title}</div>\n<form id="${formId}" action="{{BASE_URL}}canvascore-admin/submit_form.php" method="POST">\n<input type="hidden" name="_form" value="${formId}">\n<input type="hidden" name="_success" value="${successMsg}">\n<input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute; left:-9999px; width:0; height:0; opacity:0;">\n${fieldsHtml}<button type="submit" style="padding:12px 24px; background:var(--brand-color, #3b82f6); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">${btnText}</button>\n</form>\n</div>\n`;
    }

    case 'ACCORDION': {
      const items = Array.isArray(content.items) ? content.items : [];
      const multi = !!content.allowMultiple;
      const openFirst = !!content.openFirst;
      const icon = content.icon ?? 'plus';
      const variant = content.variant ?? 'card';
      const iconChar = icon === 'chevron' ? '&#9662;' : (icon === 'none' ? '' : '+');
      const rot = icon === 'chevron' ? 'rotate(180deg)' : 'rotate(45deg)';
      const itemStyle = variant === 'flat'
        ? 'border-bottom:1px solid #e2e8f0;'
        : 'margin-bottom:10px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;';
      const sumStyle = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 18px; font-weight:600; cursor:pointer; list-style:none;';
      const bodyStyle = 'padding:4px 18px 16px; font-size:15px; color:#475569; line-height:1.6;';
      let h = `<div id="${innerId}" class="cc-accordion${animClass}${innerClass}" style="${styleAttr}">\n`;
      h += `<style>#${innerId} .cc-acc-item>summary{list-style:none}#${innerId} .cc-acc-item>summary::-webkit-details-marker{display:none}#${innerId} .cc-acc-icon{transition:transform .2s ease; display:inline-block; color:var(--brand-color, #3b82f6)}#${innerId} .cc-acc-item[open]>summary .cc-acc-icon{transform:${rot}}</style>\n`;
      items.forEach((it, i) => {
        const attrs = (multi ? '' : ` name="${innerId}"`) + ((openFirst && i === 0) ? ' open' : '');
        h += `<details class="cc-acc-item"${attrs} style="${itemStyle}">\n`;
        h += `<summary style="${sumStyle}"><span class="cc-acc-title">${escapeHtml(it.title ?? '')}</span>${iconChar !== '' ? `<span class="cc-acc-icon" aria-hidden="true">${iconChar}</span>` : ''}</summary>\n`;
        h += `<div class="cc-acc-body" style="${bodyStyle}">${it.content ?? ''}</div>\n`;
        h += `</details>\n`;
      });
      h += `</div>\n`;
      return customCss + h;
    }

    case 'TABS': {
      const items = Array.isArray(content.items) ? content.items : [];
      const variant = content.variant ?? 'underline';
      const align = content.tabAlign ?? 'left';
      const justify = align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start');
      const n = items.length;
      const barStyle = `display:flex; flex-wrap:wrap; gap:6px; justify-content:${justify};` + (variant === 'underline' ? ' border-bottom:1px solid #e2e8f0;' : '');
      const tabStyle = variant === 'pills'
        ? 'display:inline-block; padding:8px 16px; border-radius:999px; font-weight:600; font-size:14px; cursor:pointer; color:#475569; background:#f1f5f9;'
        : 'display:inline-block; padding:10px 16px; font-weight:600; font-size:14px; cursor:pointer; color:#64748b; border-bottom:2px solid transparent; margin-bottom:-1px;';
      const activeCss = variant === 'pills'
        ? 'background:var(--brand-color, #3b82f6) !important; color:#fff !important;'
        : 'color:var(--brand-color, #3b82f6) !important; border-bottom-color:var(--brand-color, #3b82f6) !important;';
      let css = `#${innerId} .cc-tab-input{position:absolute; opacity:0; width:0; height:0; pointer-events:none}#${innerId} .cc-tab-panel{display:none}`;
      for (let k = 1; k <= n; k++) {
        css += `#${innerId} .cc-tab-input:nth-of-type(${k}):checked ~ .cc-tab-bar .cc-tab:nth-child(${k}){${activeCss}}`;
        css += `#${innerId} .cc-tab-input:nth-of-type(${k}):checked ~ .cc-tab-panels .cc-tab-panel:nth-child(${k}){display:block}`;
        css += `#${innerId} .cc-tab-input:nth-of-type(${k}):focus-visible ~ .cc-tab-bar .cc-tab:nth-child(${k}){outline:2px solid var(--brand-color, #3b82f6); outline-offset:2px}`;
      }
      let inputs = '', labels = '', panels = '';
      items.forEach((it, i) => {
        const k = i + 1;
        inputs += `<input type="radio" class="cc-tab-input" name="${innerId}-tabs" id="${innerId}-t${k}"${i === 0 ? ' checked' : ''}>`;
        labels += `<label class="cc-tab" for="${innerId}-t${k}" style="${tabStyle}">${escapeHtml(it.title ?? '')}</label>`;
        panels += `<div class="cc-tab-panel" style="font-size:15px; line-height:1.6; color:#475569;">${it.content ?? ''}</div>`;
      });
      let h = `<div id="${innerId}" class="cc-tabs${animClass}${innerClass}" style="${styleAttr} position:relative;">\n`;
      h += `<style>${css}</style>\n${inputs}\n`;
      h += `<div class="cc-tab-bar" style="${barStyle}">${labels}</div>\n`;
      h += `<div class="cc-tab-panels" style="padding-top:18px;">${panels}</div>\n</div>\n`;
      return customCss + h;
    }

    case 'PRICING': {
      const plans = Array.isArray(content.plans) ? content.plans : [];
      let cols = toInt(content.columns, 0);
      if (cols < 1) cols = Math.max(1, Math.min(4, plans.length));
      cols = Math.min(cols, 4);
      let cards = '';
      for (const pl of plans) {
        const hl = !!pl.highlighted;
        const name = escapeHtml(pl.name ?? '');
        const price = escapeHtml(pl.price ?? '');
        const period = escapeHtml(pl.period ?? '');
        const desc = escapeHtml(pl.description ?? '');
        const badge = escapeHtml(pl.badge ?? '');
        const btnText = escapeHtml(pl.buttonText ?? '');
        const btnUrl = escapeHtml(resolveBlockUrl(pl.buttonUrl ?? '#'));
        const cardStyle = 'position:relative; display:flex; flex-direction:column; padding:28px 24px; border-radius:14px; background:#fff; box-sizing:border-box; ' + (hl ? 'border:2px solid var(--brand-color, #3b82f6); box-shadow:0 10px 30px rgba(15,23,42,0.12);' : 'border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(15,23,42,0.04);');
        const badgeHtml = badge !== '' ? `<div class="cc-plan-badge" style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:var(--brand-color, #3b82f6); color:#fff; font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; padding:4px 12px; border-radius:999px; white-space:nowrap;">${badge}</div>` : '';
        const periodHtml = period !== '' ? `<span class="cc-plan-period" style="font-size:14px; color:#64748b; margin-left:4px;">${period}</span>` : '';
        const descHtml = desc !== '' ? `<p class="cc-plan-desc" style="margin:10px 0 0 0; font-size:14px; color:#64748b; line-height:1.5;">${desc}</p>` : '';
        let feat = '';
        const features = Array.isArray(pl.features) ? pl.features : [];
        for (const f0 of features) {
          const f = String(f0 ?? '').trim();
          if (f === '') continue;
          feat += `<li style="display:flex; gap:10px; align-items:flex-start; margin:0 0 10px 0; font-size:14px; color:#334155;"><span aria-hidden="true" style="color:var(--brand-color, #3b82f6); font-weight:700;">&#10003;</span><span>${escapeHtml(f)}</span></li>`;
        }
        const btnHtml = btnText !== '' ? `<a href="${btnUrl}" class="cc-plan-btn" style="display:block; text-align:center; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:8px; margin-top:auto; box-sizing:border-box; ${hl ? 'background:var(--brand-color, #3b82f6); color:#fff;' : 'background:#f1f5f9; color:#0f172a;'}">${btnText}</a>` : '';
        cards += `<div class="cc-plan${hl ? ' cc-plan-hl' : ''}" style="${cardStyle}">${badgeHtml}`
          + `<h3 class="cc-plan-name" style="margin:0; font-size:18px; color:#0f172a;">${name}</h3>`
          + `<div class="cc-plan-price" style="margin-top:14px; display:flex; align-items:baseline;"><span class="cc-plan-amount" style="font-size:38px; font-weight:800; color:#0f172a; line-height:1;">${price}</span>${periodHtml}</div>`
          + descHtml
          + `<ul class="cc-plan-features" style="list-style:none; padding:0; margin:20px 0 24px 0;">${feat}</ul>`
          + `${btnHtml}</div>`;
      }
      let h = `<style>@media(max-width:900px){#${innerId} .cc-pricing-grid{grid-template-columns:1fr !important}}</style>`;
      h += `<div id="${innerId}" class="cc-pricing${animClass}${innerClass}" style="${styleAttr}">\n`;
      h += `<div class="cc-pricing-grid" style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:24px; align-items:stretch; padding-top:12px;">${cards}</div>\n</div>\n`;
      return customCss + h;
    }

    case 'GALLERY': {
      const images = Array.isArray(content.images) ? content.images : [];
      const isMasonry = (content.layout ?? 'grid') === 'masonry';
      const cols = Math.max(1, Math.min(6, toInt(content.columns, 3)));
      const gap = Math.max(0, Math.min(80, toInt(content.gap, 12)));
      const ar = content.aspectRatio ?? '1 / 1';
      const radius = escapeHtml(content.borderRadius ?? '8px');
      const lightbox = (content.lightbox ?? true) !== false && images.length > 0;
      const captions = !!content.showCaptions;
      const mobCols = Math.min(cols, 2);
      const useAr = !isMasonry && !!ar && ar !== 'auto';
      const containerStyle = isMasonry
        ? `column-count:${cols}; column-gap:${gap}px;`
        : `display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:${gap}px;`;
      const figStyle = isMasonry ? `margin:0 0 ${gap}px 0; break-inside:avoid;` : 'margin:0;';
      const itemStyle = `display:block; overflow:hidden; border-radius:${radius};` + (useAr ? ` aspect-ratio:${escapeHtml(ar)};` : '') + (lightbox ? ' cursor:zoom-in;' : '');
      const imgStyle = useAr ? 'width:100%; height:100%; object-fit:cover; display:block;' : 'width:100%; height:auto; display:block;';
      let figs = '';
      for (const im of images) {
        const src = escapeHtml(im.src ?? '');
        const alt = escapeHtml(im.alt ?? '');
        const cap = escapeHtml(im.caption ?? '');
        const imgHtml = `<img src="${src}" alt="${alt}" loading="lazy" style="${imgStyle}">`;
        const inner = lightbox
          ? `<a href="${src}" class="cc-gal-item" data-caption="${cap}" style="${itemStyle}">${imgHtml}</a>`
          : `<div class="cc-gal-item" style="${itemStyle}">${imgHtml}</div>`;
        const capHtml = (captions && cap !== '') ? `<figcaption class="cc-gal-cap" style="font-size:13px; color:#64748b; margin-top:6px;">${cap}</figcaption>` : '';
        figs += `<figure class="cc-gal-fig" style="${figStyle}">${inner}${capHtml}</figure>`;
      }
      const mobCss = isMasonry ? `column-count:${mobCols} !important` : `grid-template-columns:repeat(${mobCols}, 1fr) !important`;
      let h = `<style>@media(max-width:768px){#${innerId} .cc-gal-grid{${mobCss}}}</style>`;
      h += `<div id="${innerId}" class="cc-gallery${animClass}${innerClass}" style="${styleAttr}">\n`;
      h += `<div class="cc-gal-grid" style="${containerStyle}">${figs}</div>\n`;
      if (lightbox) {
        const btn = 'position:absolute; background:rgba(15,23,42,0.6); color:#fff; border:none; cursor:pointer; line-height:1; border-radius:999px; width:44px; height:44px; font-size:26px;';
        h += `<div class="cc-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" style="display:none; position:fixed; top:0; right:0; bottom:0; left:0; background:rgba(2,6,23,0.92); z-index:100000; align-items:center; justify-content:center; flex-direction:column;">`
          + `<button type="button" class="cc-lb-close" aria-label="Close" style="${btn} top:16px; right:16px;">&times;</button>`
          + `<button type="button" class="cc-lb-prev" aria-label="Previous" style="${btn} left:16px; top:50%; margin-top:-22px;">&#8249;</button>`
          + `<img class="cc-lb-img" alt="" style="max-width:90vw; max-height:78vh; object-fit:contain; border-radius:8px;">`
          + `<div class="cc-lb-cap" style="color:#e2e8f0; font-size:14px; margin-top:12px; text-align:center; padding:0 60px;"></div>`
          + `<button type="button" class="cc-lb-next" aria-label="Next" style="${btn} right:16px; top:50%; margin-top:-22px;">&#8250;</button>`
          + `</div>\n`;
        // the lightbox <script> is emitted only by the compiler (behavior, not structure)
      }
      h += `</div>\n`;
      return customCss + h;
    }

    case 'DIVIDER': {
      const c = content;
      let style = c.style ?? 'line';
      if (!['line', 'gradient', 'dots', 'wave', 'curve', 'diagonal', 'spacer'].includes(style)) style = 'line';
      const color = ccColor(c.color, '#cbd5e1');
      const thick = Math.trunc(ccNum(c.thickness ?? 2, 1, 20, 2));
      const width = Math.trunc(ccNum(c.width ?? 100, 10, 100, 100));
      const height = Math.trunc(ccNum(c.height ?? 80, 10, 400, 80));
      const flip = !!c.flip;
      let inner;
      if (style === 'line') inner = `<hr class="cc-divider-line" style="border:0; border-top:${thick}px solid ${color}; width:${width}%; margin:0 auto;">`;
      else if (style === 'gradient') inner = `<div class="cc-divider-line" aria-hidden="true" style="height:${thick}px; width:${width}%; margin:0 auto; background:linear-gradient(90deg, transparent, ${color}, transparent);"></div>`;
      else if (style === 'dots') inner = `<div class="cc-divider-dots" aria-hidden="true" style="text-align:center; color:${color}; font-size:${8 + thick * 2}px; letter-spacing:10px; line-height:1;">&bull;&bull;&bull;</div>`;
      else if (style === 'spacer') inner = `<div class="cc-divider-spacer" aria-hidden="true" style="height:${height}px;"></div>`;
      else {
        const paths = {
          wave: 'M0,60 C150,100 350,20 600,60 C850,100 1050,20 1200,60 L1200,120 L0,120 Z',
          curve: 'M0,0 C300,120 900,120 1200,0 L1200,120 L0,120 Z',
          diagonal: 'M0,120 L1200,0 L1200,120 Z',
        };
        inner = `<svg class="cc-divider-shape" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="display:block; width:100%; height:${height}px;${flip ? ' transform:scaleY(-1);' : ''}"><path d="${paths[style]}" fill="${color}"></path></svg>`;
      }
      return customCss + `<div id="${innerId}" class="cc-divider cc-divider-${style}${animClass}${innerClass}" style="${styleAttr}">\n${inner}\n</div>\n`;
    }

    case 'CALLOUT': {
      const c = content;
      const variants = {
        info: ['#e0f2fe', '#0284c7', '#0c4a6e', '&#8505;'],
        success: ['#dcfce7', '#16a34a', '#14532d', '&#10003;'],
        warning: ['#fef3c7', '#d97706', '#78350f', '&#9888;'],
        danger: ['#fee2e2', '#dc2626', '#7f1d1d', '&#10006;'],
        note: ['#f1f5f9', '#64748b', '#1e293b', '&#9998;'],
      };
      const v = Object.prototype.hasOwnProperty.call(variants, c.variant) ? c.variant : 'info';
      const [bg, bd, fg, ic] = variants[v];
      const title = escapeHtml(c.title ?? '');
      const text = c.text ?? '';
      const showIcon = (c.showIcon ?? true) !== false;
      return customCss + `<div id="${innerId}" class="cc-callout cc-callout-${v}${animClass}${innerClass}" role="note" style="${styleAttr} display:flex; gap:14px; padding:16px 18px; border-radius:10px; border-left:4px solid ${bd}; background:${bg}; color:${fg};">`
        + (showIcon ? `<span class="cc-callout-icon" aria-hidden="true" style="font-size:20px; line-height:1.3; flex-shrink:0;">${ic}</span>` : '')
        + `<div class="cc-callout-body" style="flex:1; min-width:0;">`
        + (title !== '' ? `<div class="cc-callout-title" style="font-weight:700; margin-bottom:4px;">${title}</div>` : '')
        + `<div class="cc-callout-text" style="font-size:15px; line-height:1.55;">${text}</div></div></div>\n`;
    }

    case 'STEPS': {
      const c = content;
      const items = Array.isArray(c.items) ? c.items : [];
      const vertical = (c.layout ?? 'horizontal') === 'vertical';
      const cols = Math.max(1, Math.min(4, items.length));
      let css, rootStyle, numStyle;
      if (vertical) {
        css = `#${innerId} .cc-step{position:relative; padding-left:60px; padding-bottom:28px}#${innerId} .cc-step:last-child{padding-bottom:0}#${innerId} .cc-step:not(:last-child)::after{content:""; position:absolute; left:19px; top:44px; bottom:4px; width:2px; background:#e2e8f0}`;
        rootStyle = ' list-style:none; margin:0; padding:0;';
        numStyle = 'position:absolute; left:0; top:0; ';
      } else {
        css = `#${innerId} .cc-step{position:relative; text-align:center}#${innerId} .cc-step:not(:last-child)::after{content:""; position:absolute; top:19px; left:calc(50% + 28px); width:calc(100% - 32px); height:2px; background:#e2e8f0}@media(max-width:768px){#${innerId}.cc-steps-horizontal{grid-template-columns:1fr !important}#${innerId} .cc-step:not(:last-child)::after{display:none}}`;
        rootStyle = ` list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:24px;`;
        numStyle = 'margin:0 auto 14px; ';
      }
      let lis = '';
      items.forEach((it, i) => {
        const title = escapeHtml(it.title ?? '');
        const text = escapeHtml(it.text ?? '');
        lis += `<li class="cc-step"><div class="cc-step-num" style="${numStyle}display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:var(--brand-color, #3b82f6); color:#fff; font-weight:700;">${i + 1}</div>`
          + `<h3 class="cc-step-title" style="margin:0 0 6px 0; font-size:17px;">${title}</h3>`
          + (text !== '' ? `<p class="cc-step-text" style="margin:0; font-size:14px; color:#64748b; line-height:1.55;">${text}</p>` : '')
          + `</li>`;
      });
      return customCss + `<style>${css}</style>`
        + `<ol id="${innerId}" class="cc-steps cc-steps-${vertical ? 'vertical' : 'horizontal'}${animClass}${innerClass}" style="${styleAttr}${rootStyle}">${lis}</ol>\n`;
    }

    case 'COUNTERS': {
      const c = content;
      const items = Array.isArray(c.items) ? c.items : [];
      let cols = Math.trunc(ccNum(c.columns ?? 0, 0, 4, 0));
      if (cols < 1) cols = Math.max(1, Math.min(4, items.length));
      let cells = '';
      for (const it of items) {
        const val = ccIsNum(it.value) ? Number(it.value) : 0;
        const dec = Math.trunc(ccNum(it.decimals ?? 0, 0, 2, 0));
        const pre = escapeHtml(it.prefix ?? '');
        const suf = escapeHtml(it.suffix ?? '');
        const label = escapeHtml(it.label ?? '');
        cells += `<div class="cc-counter" style="text-align:center; padding:8px;"><div class="cc-counter-value" data-target="${val}" data-decimals="${dec}" data-prefix="${pre}" data-suffix="${suf}" style="font-size:44px; font-weight:800; color:var(--brand-color, #3b82f6); line-height:1.1; font-variant-numeric:tabular-nums;">${pre}${ccFmtNum(val, dec)}${suf}</div>`
          + (label !== '' ? `<div class="cc-counter-label" style="margin-top:6px; color:#64748b; font-size:15px;">${label}</div>` : '') + `</div>`;
      }
      let h = `<style>@media(max-width:768px){#${innerId} .cc-counters-grid{grid-template-columns:repeat(2, 1fr) !important}}</style>`;
      h += `<div id="${innerId}" class="cc-counters${animClass}${innerClass}" style="${styleAttr}">\n`;
      h += `<div class="cc-counters-grid" style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:16px;">${cells}</div>\n`;
      h += `</div>\n`;
      return customCss + h;
    }

    case 'PROGRESS': {
      const c = content;
      const items = Array.isArray(c.items) ? c.items : [];
      const hh = Math.trunc(ccNum(c.height ?? 10, 4, 30, 10));
      const showValue = (c.showValue ?? true) !== false;
      let rows = '';
      for (const it of items) {
        const label = escapeHtml(it.label ?? '');
        const val = Math.round(ccNum(it.value ?? 0, 0, 100, 0) * 10) / 10;
        const color = ccColor(it.color, 'var(--brand-color, #3b82f6)');
        rows += `<div class="cc-progress-item" style="margin-bottom:18px;"><div class="cc-progress-head" style="display:flex; justify-content:space-between; font-size:14px; font-weight:600; margin-bottom:6px;"><span class="cc-progress-label">${label}</span>`
          + (showValue ? `<span class="cc-progress-value">${val}%</span>` : '') + `</div>`
          + `<div class="cc-progress-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${val}" style="height:${hh}px; background:#e2e8f0; border-radius:999px; overflow:hidden;"><div class="cc-progress-fill" data-w="${val}" style="width:${val}%; height:100%; background:${color}; border-radius:999px;"></div></div></div>`;
      }
      return customCss + `<div id="${innerId}" class="cc-progress${animClass}${innerClass}" style="${styleAttr}">\n${rows}\n</div>\n`;
    }

    case 'TABLE': {
      const c = content;
      const rows = ccLines(c.data ?? '').map((l) => l.split(/\s*\|\s*|\t/));
      const headerRow = (c.headerRow ?? true) !== false;
      const striped = (c.striped ?? true) !== false;
      const bordered = !!c.bordered;
      const compact = !!c.compact;
      const rowHeaders = !!c.rowHeaders;
      const sticky = !!c.stickyHeader;
      const maxH = Math.trunc(ccNum(c.maxHeight ?? 0, 0, 1200, 0));
      const caption = escapeHtml(c.caption ?? '');
      const head = (headerRow && rows.length) ? rows.shift() : null;
      let ncols = head ? head.length : 0;
      for (const r of rows) ncols = Math.max(ncols, r.length);
      const pad = compact ? '6px 10px' : '12px 14px';
      const wrap = 'overflow-x:auto;' + ((sticky && maxH > 0) ? ` max-height:${maxH}px; overflow-y:auto;` : '');
      const cellBorder = bordered ? 'border:1px solid #e2e8f0;' : 'border-bottom:1px solid #e2e8f0;';
      const thStyle = `padding:${pad}; background:#f1f5f9; border-bottom:2px solid #cbd5e1; font-weight:700;` + (sticky ? ' position:sticky; top:0;' : '') + (bordered ? ' border:1px solid #cbd5e1;' : '');
      let table = '';
      if (ncols > 0) {
        table += `<table class="cc-table" style="width:100%; border-collapse:collapse; font-size:14px; text-align:left;">`;
        if (caption !== '') table += `<caption style="caption-side:top; text-align:left; font-weight:700; padding:0 0 10px 0;">${caption}</caption>`;
        if (head) {
          table += '<thead><tr>';
          for (let i = 0; i < ncols; i++) table += `<th scope="col" style="${thStyle}">${escapeHtml(head[i] ?? '')}</th>`;
          table += '</tr></thead>';
        }
        table += '<tbody>';
        rows.forEach((r, ri) => {
          table += `<tr${(striped && ri % 2 === 1) ? ' style="background:#f8fafc;"' : ''}>`;
          for (let i = 0; i < ncols; i++) {
            const cell = escapeHtml(r[i] ?? '');
            if (i === 0 && rowHeaders) table += `<th scope="row" style="padding:${pad}; ${cellBorder} font-weight:600;">${cell}</th>`;
            else table += `<td style="padding:${pad}; ${cellBorder}">${cell}</td>`;
          }
          table += '</tr>';
        });
        table += '</tbody></table>';
      }
      return customCss + `<div id="${innerId}" class="cc-table-block${animClass}${innerClass}" style="${styleAttr}">\n<div class="cc-table-wrap" style="${wrap}">${table}</div>\n</div>\n`;
    }

    case 'COUNTDOWN': {
      const c = content;
      let dt = String(c.datetime ?? '').trim();
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt)) dt = '2030-01-01T00:00';
      let tz = String(c.utcOffset ?? 'local');
      if (tz !== 'local' && !/^[+-]\d{2}:\d{2}$/.test(tz)) tz = 'local';
      const target = tz === 'local' ? dt : dt + ':00' + tz;
      const dateText = dt.replace('T', ' ') + (tz === 'local' ? '' : ' UTC' + tz);
      const end = (c.endAction ?? 'message') === 'hide' ? 'hide' : 'message';
      const endMsg = escapeHtml(c.endMessage ?? '');
      const showSeconds = (c.showSeconds ?? true) !== false;
      const showDate = (c.showDate ?? true) !== false;
      const units = [['days', 'labelDays', 'Days'], ['hours', 'labelHours', 'Hours'], ['minutes', 'labelMinutes', 'Minutes']];
      if (showSeconds) units.push(['seconds', 'labelSeconds', 'Seconds']);
      let cells = '';
      for (const u of units) {
        cells += `<div class="cc-cd-unit" style="text-align:center; min-width:72px;"><span class="cc-cd-num" data-unit="${u[0]}" style="display:block; font-size:42px; font-weight:800; line-height:1.1; font-variant-numeric:tabular-nums; color:var(--brand-color, #3b82f6);">00</span>`
          + `<span class="cc-cd-label" style="display:block; font-size:13px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-top:4px;">${escapeHtml(c[u[1]] ?? u[2])}</span></div>`;
      }
      let h = `<div id="${innerId}" class="cc-countdown${animClass}${innerClass}" data-target="${escapeHtml(target)}" data-end="${end}" role="timer" style="${styleAttr}">\n`;
      h += `<div class="cc-cd-units" style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">${cells}</div>\n`;
      if (showDate) h += `<div class="cc-cd-date" style="text-align:center; font-size:13px; color:#94a3b8; margin-top:12px;"><time datetime="${escapeHtml(target)}">${escapeHtml(dateText)}</time></div>\n`;
      h += `<div class="cc-cd-done" hidden style="text-align:center; font-size:22px; font-weight:700;">${endMsg}</div>\n`;
      h += `</div>\n`;
      return customCss + h;
    }

    case 'TIMELINE': {
      const c = content;
      const items = Array.isArray(c.items) ? c.items : [];
      const alt = (c.layout ?? 'left') === 'alternate';
      let css = `#${innerId}::before{content:""; position:absolute; left:9px; top:6px; bottom:6px; width:2px; background:#e2e8f0}#${innerId} .cc-tl-item{position:relative; margin-bottom:28px}#${innerId} .cc-tl-item:last-child{margin-bottom:0}#${innerId} .cc-tl-dot{position:absolute; left:-34px; top:4px; width:20px; height:20px; border-radius:50%; background:var(--brand-color, #3b82f6); border:4px solid #fff; box-shadow:0 0 0 2px #e2e8f0; box-sizing:border-box}`;
      if (alt) {
        css += `@media(min-width:769px){#${innerId}{padding-left:0 !important}#${innerId}::before{left:50%; margin-left:-1px}#${innerId} .cc-tl-item{width:50%; box-sizing:border-box; padding-right:36px; text-align:right}#${innerId} .cc-tl-item:nth-child(even){margin-left:50%; padding-right:0; padding-left:36px; text-align:left}#${innerId} .cc-tl-dot{left:auto; right:-46px}#${innerId} .cc-tl-item:nth-child(even) .cc-tl-dot{right:auto; left:-46px}}`;
      }
      let lis = '';
      for (const it of items) {
        const date = escapeHtml(it.date ?? '');
        const title = escapeHtml(it.title ?? '');
        const text = escapeHtml(it.text ?? '');
        lis += `<li class="cc-tl-item"><span class="cc-tl-dot" aria-hidden="true"></span>`
          + (date !== '' ? `<div class="cc-tl-date" style="font-size:13px; font-weight:700; color:var(--brand-color, #3b82f6); margin-bottom:4px;">${date}</div>` : '')
          + `<h3 class="cc-tl-title" style="margin:0 0 6px 0; font-size:18px;">${title}</h3>`
          + (text !== '' ? `<p class="cc-tl-text" style="margin:0; font-size:14px; color:#64748b; line-height:1.55;">${text}</p>` : '')
          + `</li>`;
      }
      return customCss + `<style>${css}</style><ol id="${innerId}" class="cc-timeline cc-timeline-${alt ? 'alternate' : 'left'}${animClass}${innerClass}" style="${styleAttr} list-style:none; margin:0; padding:0 0 0 34px; position:relative;">${lis}</ol>\n`;
    }

    case 'LOGOS': {
      const c = content;
      const logos = Array.isArray(c.logos) ? c.logos : [];
      const marquee = (c.layout ?? 'grid') === 'marquee';
      const title = escapeHtml(c.title ?? '');
      const cols = Math.trunc(ccNum(c.columns ?? 5, 1, 8, 5));
      const hh = Math.trunc(ccNum(c.height ?? 48, 20, 120, 48));
      const gap = Math.trunc(ccNum(c.gap ?? 40, 8, 80, 40));
      const gray = (c.grayscale ?? true) !== false;
      const speed = Math.trunc(ccNum(c.speed ?? 30, 10, 120, 30));
      const imgStyle = `height:${hh}px; width:auto; max-width:100%; object-fit:contain; display:block;` + (gray ? ' filter:grayscale(1); opacity:0.7; transition:filter 0.2s, opacity 0.2s;' : '');
      const mk = (lg, dup) => {
        const src = escapeHtml(lg.src ?? '');
        const altT = dup ? '' : escapeHtml(lg.alt ?? '');
        const href = resolveBlockUrl(lg.href ?? '');
        const img = `<img src="${src}" alt="${altT}" loading="lazy" style="${imgStyle}">`;
        const box = 'display:flex; align-items:center; justify-content:center;';
        if (String(lg.href ?? '').trim() !== '' && href !== '#') {
          return `<a href="${escapeHtml(href)}" class="cc-logo-item" rel="noopener"${dup ? ' tabindex="-1" aria-hidden="true"' : ''} style="${box}">${img}</a>`;
        }
        return `<div class="cc-logo-item"${dup ? ' aria-hidden="true"' : ''} style="${box}">${img}</div>`;
      };
      let set1 = '', set2 = '';
      for (const lg of logos) { set1 += mk(lg, false); set2 += mk(lg, true); }
      let css = gray ? `#${innerId} .cc-logo-item:hover img,#${innerId} .cc-logo-item:focus-visible img{filter:none !important; opacity:1 !important}` : '';
      let body;
      if (marquee) {
        css += `@keyframes ccMq_${innerId}{from{transform:translateX(0)}to{transform:translateX(-50%)}}#${innerId} .cc-logos-track{animation:ccMq_${innerId} ${speed}s linear infinite}#${innerId} .cc-logos-marquee:hover .cc-logos-track{animation-play-state:paused}@media(prefers-reduced-motion:reduce){#${innerId} .cc-logos-track{animation:none; flex-wrap:wrap; width:auto !important}#${innerId} .cc-logos-set[aria-hidden="true"]{display:none}}`;
        const setStyle = `display:flex; align-items:center; gap:${gap}px; padding-right:${gap}px;`;
        body = `<div class="cc-logos-marquee" style="overflow:hidden;"><div class="cc-logos-track" style="display:flex; width:max-content;"><div class="cc-logos-set" style="${setStyle}">${set1}</div><div class="cc-logos-set" aria-hidden="true" style="${setStyle}">${set2}</div></div></div>`;
      } else {
        css += `@media(max-width:768px){#${innerId} .cc-logos-grid{grid-template-columns:repeat(${Math.min(cols, 3)}, 1fr) !important}}`;
        body = `<div class="cc-logos-grid" style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:${gap}px; align-items:center; justify-items:center;">${set1}</div>`;
      }
      return customCss + `<style>${css}</style><div id="${innerId}" class="cc-logos${animClass}${innerClass}" style="${styleAttr}">\n`
        + (title !== '' ? `<div class="cc-logos-title" style="text-align:center; font-size:14px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:24px;">${title}</div>` : '')
        + body + `\n</div>\n`;
    }

    case 'TEAM': {
      const c = content;
      const members = Array.isArray(c.members) ? c.members : [];
      let cols = Math.trunc(ccNum(c.columns ?? 0, 0, 4, 0));
      if (cols < 1) cols = Math.max(1, Math.min(4, members.length));
      const shape = c.photoShape ?? 'circle';
      const radius = shape === 'square' ? '0' : (shape === 'rounded' ? '16px' : '50%');
      const card = (c.layout ?? 'card') === 'card';
      const cardStyle = card ? 'background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:24px; ' : 'padding:8px; ';
      const linkDefs = [['email', 'Email'], ['linkedin', 'LinkedIn'], ['twitter', 'X'], ['website', 'Website']];
      let cells = '';
      for (const m of members) {
        const name = escapeHtml(m.name ?? '');
        const role = escapeHtml(m.role ?? '');
        const bio = escapeHtml(m.bio ?? '');
        const photo = String(m.photo ?? '').trim();
        const pstyle = `width:112px; height:112px; border-radius:${radius}; margin:0 auto 14px; `;
        const media = photo !== ''
          ? `<img src="${escapeHtml(photo)}" alt="${name}" loading="lazy" style="${pstyle}object-fit:cover; display:block;">`
          : `<div class="cc-member-initials" aria-hidden="true" style="${pstyle}background:#e0e7ff; color:#3730a3; display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:700; text-transform:uppercase;">${escapeHtml(ccInitials(m.name ?? ''))}</div>`;
        let links = '';
        for (const ld of linkDefs) {
          const raw = String(m[ld[0]] ?? '').trim();
          if (raw === '') continue;
          let href;
          if (ld[0] === 'email') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) continue; href = 'mailto:' + raw; }
          else href = ccExtUrl(raw);
          links += `<a href="${escapeHtml(href)}" class="cc-member-link" rel="noopener" aria-label="${name} - ${ld[1]}" style="color:inherit;">${ld[1]}</a>`;
        }
        cells += `<div class="cc-member" style="${cardStyle}text-align:center;">${media}`
          + `<h3 class="cc-member-name" style="margin:0; font-size:18px;">${name}</h3>`
          + (role !== '' ? `<div class="cc-member-role" style="color:var(--brand-color, #3b82f6); font-weight:600; font-size:14px; margin-top:2px;">${role}</div>` : '')
          + (bio !== '' ? `<p class="cc-member-bio" style="margin:10px 0 0 0; font-size:14px; color:#64748b; line-height:1.55;">${bio}</p>` : '')
          + (links !== '' ? `<div class="cc-member-links" style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:12px; font-size:13px;">${links}</div>` : '')
          + `</div>`;
      }
      return customCss + `<style>@media(max-width:768px){#${innerId} .cc-team-grid{grid-template-columns:repeat(${Math.min(cols, 2)}, 1fr) !important}}@media(max-width:480px){#${innerId} .cc-team-grid{grid-template-columns:1fr !important}}</style>`
        + `<div id="${innerId}" class="cc-team${animClass}${innerClass}" style="${styleAttr}">\n`
        + `<div class="cc-team-grid" style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:24px;">${cells}</div>\n</div>\n`;
    }

    case 'BEFORE_AFTER': {
      const c = content;
      const b = (c.before && typeof c.before === 'object') ? c.before : {};
      const a = (c.after && typeof c.after === 'object') ? c.after : {};
      const start = Math.round(ccNum(c.startPosition ?? 50, 0, 100, 50));
      const ar = escapeHtml(c.aspectRatio ?? '16 / 9');
      const showLabels = (c.showLabels ?? true) !== false;
      const img = 'width:100%; height:100%; object-fit:cover; display:block;';
      const chip = 'position:absolute; top:12px; background:rgba(15,23,42,0.7); color:#fff; font-size:12px; padding:3px 9px; border-radius:6px;';
      let h = `<style>#${innerId}:focus-within .cc-ba-knob{outline:2px solid var(--brand-color, #3b82f6); outline-offset:2px}</style>`;
      h += `<div id="${innerId}" class="cc-ba${animClass}${innerClass}" style="${styleAttr} --pos:${start}%; position:relative; overflow:hidden; aspect-ratio:${ar}; user-select:none;">\n`;
      h += `<img class="cc-ba-after" src="${escapeHtml(a.src ?? '')}" alt="${escapeHtml(a.alt ?? '')}" loading="lazy" style="position:absolute; top:0; left:0; ${img}">`;
      h += `<div class="cc-ba-before" style="position:absolute; top:0; left:0; width:100%; height:100%; clip-path:inset(0 calc(100% - var(--pos)) 0 0);"><img src="${escapeHtml(b.src ?? '')}" alt="${escapeHtml(b.alt ?? '')}" loading="lazy" style="${img}"></div>`;
      if (showLabels) {
        h += `<span class="cc-ba-label cc-ba-label-before" style="${chip} left:12px;">${escapeHtml(b.label ?? 'Before')}</span>`;
        h += `<span class="cc-ba-label cc-ba-label-after" style="${chip} right:12px;">${escapeHtml(a.label ?? 'After')}</span>`;
      }
      h += `<div class="cc-ba-handle" aria-hidden="true" style="position:absolute; top:0; bottom:0; left:var(--pos); width:2px; margin-left:-1px; background:#fff; pointer-events:none;"><span class="cc-ba-knob" style="position:absolute; top:50%; left:50%; width:36px; height:36px; margin:-18px 0 0 -18px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; font-size:14px; color:#0f172a;">&#8596;</span></div>`;
      h += `<input type="range" class="cc-ba-range" min="0" max="100" step="0.1" value="${start}" aria-label="Comparison slider" style="position:absolute; top:0; left:0; width:100%; height:100%; margin:0; opacity:0; cursor:ew-resize;">\n`;
      h += `</div>\n`;
      return customCss + h;
    }

    case 'BUSINESS': {
      const c = content;
      const types = ['LocalBusiness', 'Restaurant', 'Store', 'CafeOrCoffeeShop', 'Dentist', 'HairSalon', 'HealthAndBeautyBusiness', 'ProfessionalService', 'LegalService', 'AutoRepair', 'Hotel', 'Organization'];
      void types;
      const nameRaw = String(c.name ?? '').trim();
      const addrLines = ccLines(c.address ?? '');
      const phone = String(c.phone ?? '').trim();
      const phoneDigits = phone.replace(/[^0-9+]/g, '');
      const email = String(c.email ?? '').trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const web = ccExtUrl(c.website ?? '');
      const closedLabel = escapeHtml(c.closedLabel ?? 'Closed');
      const hoursTitle = escapeHtml(c.hoursTitle ?? 'Opening hours');
      const note = escapeHtml(c.note ?? '');
      const hours = Array.isArray(c.hours) ? c.hours.slice(0, 7) : [];
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      let contact = '';
      if (nameRaw !== '') contact += `<h3 class="cc-biz-name" style="margin:0 0 10px 0; font-size:20px;">${escapeHtml(nameRaw)}</h3>`;
      if (addrLines.length) contact += `<address class="cc-biz-address" style="font-style:normal; line-height:1.6; margin:0 0 10px 0;">${ccBr(c.address ?? '')}</address>`;
      if (phoneDigits !== '') contact += `<div class="cc-biz-line" style="margin-bottom:4px;"><a class="cc-biz-link" href="tel:${escapeHtml(phoneDigits)}" style="color:inherit;">${escapeHtml(phone)}</a></div>`;
      if (emailOk) contact += `<div class="cc-biz-line" style="margin-bottom:4px;"><a class="cc-biz-link" href="mailto:${escapeHtml(email)}" style="color:inherit;">${escapeHtml(email)}</a></div>`;
      if (web !== '') contact += `<div class="cc-biz-line" style="margin-bottom:4px;"><a class="cc-biz-link" href="${escapeHtml(web)}" rel="noopener" style="color:inherit;">${escapeHtml(web.replace(/^https?:\/\//i, ''))}</a></div>`;
      if (addrLines.length && ((c.mapsLink ?? true) !== false)) {
        contact += `<a class="cc-biz-directions" rel="noopener" href="${escapeHtml('https://www.google.com/maps/search/?api=1&query=' + ccEnc(addrLines.join(', ')))}" style="display:inline-block; margin-top:12px; padding:9px 16px; border-radius:8px; background:var(--brand-color, #3b82f6); color:#fff; text-decoration:none; font-weight:600; font-size:14px;">${escapeHtml(c.directionsLabel ?? 'Get directions')}</a>`;
      }
      let rows = '';
      hours.forEach((hr, i) => {
        const closed = !!hr.closed;
        const open = String(hr.open ?? '').trim(); const close = String(hr.close ?? '').trim();
        const okTimes = /^\d{2}:\d{2}$/.test(open) && /^\d{2}:\d{2}$/.test(close);
        const val = (closed || !okTimes) ? closedLabel : escapeHtml(open) + '&ndash;' + escapeHtml(close);
        rows += `<tr style="border-bottom:1px solid #e2e8f0;"><th scope="row" style="text-align:left; padding:8px 0; font-weight:600;">${escapeHtml(hr.day ?? dayNames[i])}</th><td style="text-align:right; padding:8px 0;">${val}</td></tr>`;
      });
      let hoursHtml = '';
      if (rows !== '' || note !== '') {
        hoursHtml = `<div class="cc-biz-hours"><h3 class="cc-biz-hours-title" style="margin:0 0 10px 0; font-size:20px;">${hoursTitle}</h3>`
          + (rows !== '' ? `<table class="cc-biz-table" style="width:100%; border-collapse:collapse; font-size:15px;"><tbody>${rows}</tbody></table>` : '')
          + (note !== '' ? `<p class="cc-biz-note" style="margin:10px 0 0 0; font-size:13px; color:#64748b;">${note}</p>` : '') + `</div>`;
      }
      let h = `<style>@media(max-width:768px){#${innerId}{grid-template-columns:1fr !important}}</style>`;
      h += `<div id="${innerId}" class="cc-business${animClass}${innerClass}" style="${styleAttr} display:grid; grid-template-columns:repeat(2, 1fr); gap:32px;">\n`;
      h += `<div class="cc-biz-contact">${contact}</div>\n${hoursHtml}\n`;
      h += `</div>\n`;
      return customCss + h;
    }

    case 'COLLECTION_LIST':
      return `<!-- CollectionList: ${escapeHtml(content.collectionSlug || content.collectionId || '')} -->\n`;

    case 'HTML':
      return customCss + `<div id="${innerId}" class="cc-html-block${animClass}${innerClass}"${styleString}>\n${content.code ?? ''}\n</div>\n`;

    default:
      return `<!-- Unknown element: ${t} -->\n`;
  }
}

export default renderBlock;
