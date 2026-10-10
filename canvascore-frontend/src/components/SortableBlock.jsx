import React, { useRef, useEffect } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import JoditEditor from 'jodit-react';
import { Crown } from 'lucide-react';
import { renderBlock, blockRoot } from '../render/renderBlock.mjs';

const EDITABLE = ['TEXT', 'HERO', 'IMAGE_TEXT', 'FORM', 'HTML'];
const CONTAINERS = ['SECTION', 'CONTAINER', 'FLEX_ROW', 'CSS_GRID'];
// Blocchi il cui HTML canonico e' interattivo anche nel canvas (details/radio nativi, senza JS):
// il click apre/cambia tab E seleziona il blocco (l'evento risale alla cornice).
const INTERACTIVE = ['ACCORDION', 'TABS', 'BEFORE_AFTER'];

// Proprietà che definiscono come il blocco si DIMENSIONA/POSIZIONA come item del genitore:
// vanno sulla cornice (così flex/grid si comportano come nel sito), non duplicate nel contenuto.
const SIZING_KEYS = ['width', 'maxWidth', 'minWidth', 'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'gridColumn', 'gridRow', 'order'];

function splitStyles(styles = {}) {
  const outer = {};
  const inner = { ...styles };
  for (const k of SIZING_KEYS) {
    if (styles[k] !== undefined && styles[k] !== '') outer[k] = styles[k];
    delete inner[k];
  }
  // Il contenuto riempie la cornice (height/minHeight restano intrinseche al blocco)
  inner.width = '100%';
  inner.margin = '0';
  if (styles.maxWidth !== undefined) inner.maxWidth = 'none';
  inner.minWidth = 0;
  return { outer, inner };
}

const editorConfig = {
  readonly: false,
  toolbarAdaptive: false,
  buttons: ['bold', 'italic', 'underline', 'strikethrough', '|', 'font', 'fontsize', 'color', 'brush', '|', 'align', 'ul', 'ol', '|', 'link', 'image', '|', 'source'],
};

function canonicalHtml(block) {
  return renderBlock(block).replace(/\{\{BASE_URL\}\}/g, '#');
}

export default function SortableBlock({ block, isMasterPreview = false }) {
  const { selectedBlockId, setSelectedBlockId, updateBlock, viewport, masters } = useStore();
  const isSelected = selectedBlockId === block.id && !isMasterPreview;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: block.id,
    disabled: isMasterPreview,
  });

  // Animazione slider (fade/slide) nell'editor: pilota il DOM canonico iniettato
  const sliderRef = useRef(null);
  useEffect(() => {
    if (block.type !== 'SLIDER') return;
    const root = sliderRef.current;
    if (!root) return;
    const slides = root.querySelectorAll('.cc-slide');
    if (!slides || slides.length < 2) return;
    const isFade = block.content?.effect === 'fade';
    const delay = Math.max(1200, parseInt(block.content?.delay, 10) || 3000);
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % slides.length;
      if (isFade) {
        slides.forEach((s, k) => { s.style.opacity = k === i ? '1' : '0'; });
      } else {
        const track = root.querySelector('.cc-slides');
        if (track) track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
      }
    }, delay);
    return () => clearInterval(id);
  }, [block]);

  // Prima/Dopo: nell'editor gli <script> dell'HTML iniettato non girano, quindi si collega il cursore qui
  // (stesso comportamento dello script pubblicato: il cursore imposta --pos).
  const baRef = useRef(null);
  useEffect(() => {
    if (block.type !== 'BEFORE_AFTER') return undefined;
    const root = baRef.current && baRef.current.querySelector('.cc-ba');
    const range = root && root.querySelector('.cc-ba-range');
    if (!range) return undefined;
    const set = () => root.style.setProperty('--pos', range.value + '%');
    range.addEventListener('input', set);
    return () => range.removeEventListener('input', set);
  }, [block]);

  const handleClick = (e) => {
    if (isMasterPreview) return;
    e.stopPropagation();
    setSelectedBlockId(block.id);
  };

  const handleContentChange = (key, value) => {
    updateBlock(block.id, { content: { ...block.content, [key]: value } });
  };

  const { outer, inner } = splitStyles(block.styles || {});
  const innerBlock = { ...block, styles: inner };

  // Cornice: neutra + proprietà di sizing/posizionamento (si comporta come l'item nel genitore)
  const wrapperStyle = {
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    outline: isSelected ? '2px solid #38bdf8' : 'none',
    outlineOffset: '-2px',
    cursor: isMasterPreview ? 'inherit' : (isSelected ? 'default' : 'pointer'),
    zIndex: isDragging ? 1000 : 1,
    boxSizing: 'border-box',
    ...outer,
    minHeight: CONTAINERS.includes(block.type) ? (outer.minHeight || '40px') : outer.minHeight,
  };

  const innerId = block.content?.customId || block.id;
  const innerClass = block.content?.customClass || '';

  const dragHandle = isSelected && (
    <div {...attributes} {...listeners} style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#38bdf8', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', cursor: 'grab', zIndex: 50, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      {block.type}
    </div>
  );

  const emptyPlaceholder = (label) => (
    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(148, 163, 184, 0.4)', borderRadius: '8px', fontSize: '11px', margin: '10px' }}>{label}</div>
  );

  const renderBody = () => {
    // MASTER
    if (block.type === 'MASTER') {
      const masterInfo = masters.find(m => m.id === block.content.masterId);
      let masterRealContent = null;
      if (masterInfo) { try { masterRealContent = JSON.parse(masterInfo.content_json); } catch (e) { /* noop */ } }
      return (
        <div id={innerId} className={`cc-master-wrapper ${innerClass}`} style={{ outline: isSelected ? '2px solid #fcd34d' : '1px solid transparent', position: 'relative', width: '100%' }}>
          {isSelected && (
            <div style={{ position: 'absolute', top: 0, right: 0, background: '#fcd34d', color: '#78350f', fontSize: '10px', padding: '4px 8px', fontWeight: 'bold', zIndex: 10, borderBottomLeftRadius: '6px' }}>👑 GLOBAL MASTER</div>
          )}
          <div style={{ pointerEvents: 'none' }}>
            {masterRealContent ? (
              <SortableBlock block={masterRealContent} isMasterPreview={true} />
            ) : (
              <div style={{ padding: '40px 20px', background: '#fef3c7', border: '2px dashed #f59e0b', borderRadius: '12px', textAlign: 'center', color: '#92400e' }}>
                <Crown size={32} color="#d97706" style={{ margin: '0 auto 10px', display: 'block' }} />
                <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{block.content.name || 'Master Component'}</h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>⚠ Content not found.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // COLLECTION_LIST: blocco dinamico (le voci reali le inserisce il compiler in build)
    if (block.type === 'COLLECTION_LIST') {
      const c = block.content || {};
      const cols = Math.max(1, parseInt(c.columns, 10) || 3);
      return (
        <div style={{ padding: '14px', pointerEvents: isMasterPreview ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#64748b', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>\uD83D\uDCDA Collection List</span>
            <span style={{ color: '#38bdf8' }}>{c.collectionName || c.collectionSlug || 'choose a collection \u2192'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px' }}>
            {Array.from({ length: Math.min(cols, Math.max(1, parseInt(c.limit, 10) || cols)) }).map((_, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                {c.showCover !== false && <div style={{ aspectRatio: '16/9', background: '#e2e8f0' }} />}
                <div style={{ padding: '14px' }}>
                  {c.showDate !== false && <div style={{ height: '8px', width: '40%', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' }} />}
                  <div style={{ height: '12px', width: '75%', background: '#cbd5e1', borderRadius: '4px' }} />
                  {c.showExcerpt !== false && <div style={{ height: '8px', width: '95%', background: '#e2e8f0', borderRadius: '4px', marginTop: '8px' }} />}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>Live items are generated on publish.</div>
        </div>
      );
    }

    // CONTAINER: radice canonica (con sizing neutralizzato) + figli React interattivi
    if (CONTAINERS.includes(block.type)) {
      const r = blockRoot(innerBlock);
      const style = { ...r.style, boxSizing: 'border-box' };
      if (block.type === 'CSS_GRID' && viewport === 'mobile') style.gridTemplateColumns = '1fr';
      const kids = block.children || [];
      const childIds = kids.map(c => c.id);
      const children = kids.length > 0
        ? <SortableContext items={childIds} strategy={verticalListSortingStrategy}>{kids.map(c => <SortableBlock key={c.id} block={c} isMasterPreview={isMasterPreview} />)}</SortableContext>
        : emptyPlaceholder(`Empty ${block.type}. Drop elements here.`);
      return React.createElement(r.tag, { id: r.id, className: r.className, style }, children);
    }

    // EDITABILI selezionati: editing inline
    if (EDITABLE.includes(block.type) && isSelected && !isMasterPreview) {
      const box = { boxSizing: 'border-box', width: '100%' };
      if (block.type === 'TEXT') {
        return (
          <div id={innerId} className={innerClass} style={box} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
            <JoditEditor value={block.content.text || ''} config={editorConfig} onBlur={(val) => handleContentChange('text', val)} />
          </div>
        );
      }
      if (block.type === 'HTML') {
        return (
          <textarea rows="6" value={block.content.code || ''} onChange={(e) => handleContentChange('code', e.target.value)} onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', padding: '12px', fontFamily: 'monospace', fontSize: '13px', background: '#0f172a', color: '#38bdf8', border: '1px solid #334155', borderRadius: '6px', boxSizing: 'border-box' }} />
        );
      }
      if (block.type === 'HERO') {
        return (
          <div id={innerId} className={innerClass} style={{ ...box, padding: '20px', background: '#0f172a' }}>
            <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{ background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
              <JoditEditor value={block.content.title || ''} config={editorConfig} onBlur={(val) => handleContentChange('title', val)} />
            </div>
            <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{ background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '8px' }}>
              <JoditEditor value={block.content.subtitle || ''} config={editorConfig} onBlur={(val) => handleContentChange('subtitle', val)} />
            </div>
          </div>
        );
      }
      if (block.type === 'IMAGE_TEXT') {
        return (
          <div id={innerId} className={innerClass} style={{ ...box, display: 'flex', gap: '30px', alignItems: 'center', flexDirection: block.content.layout === 'img-right' ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}><img src={block.content.src} alt="" style={{ width: '100%', borderRadius: '8px', display: 'block' }} /></div>
            <div style={{ flex: '1 1 300px' }} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              <JoditEditor value={block.content.text || ''} config={editorConfig} onBlur={(val) => handleContentChange('text', val)} />
            </div>
          </div>
        );
      }
      if (block.type === 'FORM') {
        return (
          <div id={innerId} className={innerClass} style={box}>
            <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{ marginBottom: '20px', border: '1px dashed #cbd5e1', padding: '10px', background: '#fff', borderRadius: '8px' }}>
              <JoditEditor value={block.content.title || '<h3>Contact Us</h3>'} config={editorConfig} onBlur={(val) => handleContentChange('title', val)} />
            </div>
            <div style={{ pointerEvents: 'none', opacity: 0.85 }} dangerouslySetInnerHTML={{ __html: canonicalHtml({ ...innerBlock, content: { ...block.content, title: '' } }) }} />
          </div>
        );
      }
    }

    // SLIDER: HTML canonico + animazione pilotata via ref
    if (block.type === 'SLIDER') {
      return (
        <div ref={sliderRef} style={{ pointerEvents: isMasterPreview ? 'auto' : 'none', width: '100%' }} dangerouslySetInnerHTML={{ __html: canonicalHtml(innerBlock) }} />
      );
    }

    // Tutto il resto (ed editabili non selezionati): HTML canonico = identico al sito
    return (
      <div ref={block.type === 'BEFORE_AFTER' ? baRef : undefined} style={{ pointerEvents: (isMasterPreview || INTERACTIVE.includes(block.type)) ? 'auto' : 'none', width: '100%' }} dangerouslySetInnerHTML={{ __html: canonicalHtml(innerBlock) }} />
    );
  };

  return (
    <div ref={setNodeRef} style={wrapperStyle} onClick={handleClick}>
      {dragHandle}
      {block.content?.customCss && <style>{String(block.content.customCss).replace(/__THIS__/g, `#${innerId}`)}</style>}
      {renderBody()}
    </div>
  );
}
