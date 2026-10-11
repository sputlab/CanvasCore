import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import SortableBlock from './SortableBlock';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// The site's effects CSS. In the editor, entrance animations and looping motion stay still
// (blocks visible, text easy to edit) and play only on "Preview" (previewEffects.js); hovers stay live.
const EFFECTS_CSS = (typeof __EFFECTS_CSS__ !== 'undefined' ? __EFFECTS_CSS__ : '') + `
.cc-canvas .cc-reveal:not(.is-visible) { opacity: 1; }
.cc-canvas [class*="cc-loop-"]:not(.cc-fx-preview) { animation: none !important; }`;

// Brand color and font of the site (Global Options), loaded once; the font also from Google Fonts.
function useSiteLook() {
  const [look, setLook] = useState({ brandColor: '#3b82f6', fontFamily: '' });
  useEffect(() => {
    let alive = true;
    fetch('api.php?action=get_settings')
      .then((res) => res.json())
      .then((data) => {
        if (!alive || !data || typeof data !== 'object') return;
        const fontFamily = typeof data.fontFamily === 'string' ? data.fontFamily.replace(/['"<>;{}]/g, '') : '';
        setLook({ brandColor: /^#[0-9a-fA-F]{3,8}$/.test(data.brandColor || '') ? data.brandColor : '#3b82f6', fontFamily });
        if (fontFamily && !document.getElementById('cc-canvas-font')) {
          const link = document.createElement('link');
          link.id = 'cc-canvas-font'; link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;600;700;900&display=swap`;
          document.head.appendChild(link);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return look;
}

export default function Canvas() {
  const { blocks, moveBlock, activePage, viewport, setSelectedBlockId } = useStore();
  const site = useSiteLook();

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      moveBlock(active.id, over.id);
    }
  };

  const isBoxed = activePage?.layout === 'boxed';
  let canvasWidth = '100%';
  if (viewport === 'mobile') canvasWidth = '375px';
  else if (viewport === 'tablet') canvasWidth = '768px';

  const wrapperStyle = {
    width: canvasWidth,
    maxWidth: isBoxed && viewport === 'desktop' ? (activePage?.boxed_width || '1200px') : '100%',
    margin: '0 auto',
    padding: isBoxed ? '0 20px' : '0',
    minHeight: '100vh',
    backgroundColor: activePage?.bg_color || '#ffffff',
    transition: 'width 0.3s ease, max-width 0.3s ease',
    boxShadow: viewport !== 'desktop' ? '0 0 50px rgba(0,0,0,0.5)' : 'none',
    border: viewport !== 'desktop' ? '12px solid #0f172a' : 'none',
    borderRadius: viewport !== 'desktop' ? '30px' : '0',
    overflow: 'hidden',
    position: 'relative',
    // Same variables as master.html, so brand-colored buttons and the site font match the published page
    '--brand-color': site.brandColor,
    '--font-family': site.fontFamily ? `'${site.fontFamily}', sans-serif` : undefined
  };

  return (
    <div style={{ padding: viewport !== 'desktop' ? '40px 0' : '0', minHeight: '100%', display: 'flex', justifyContent: 'center' }} onClick={() => setSelectedBlockId(null)}>
      <style>{EFFECTS_CSS}</style>
      <div className="cc-canvas" style={wrapperStyle} onClick={(e) => {
        // Clicking the empty area of the page clears the selection
        if(e.target === e.currentTarget) setSelectedBlockId(null);
      }}>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map(block => (
              <SortableBlock key={block.id} block={block} />
            ))}
          </SortableContext>
        </DndContext>
        <div style={{ height: '250px', width: '100%', clear: 'both', pointerEvents: 'none' }}></div>
      </div>
    </div>
  );
}
