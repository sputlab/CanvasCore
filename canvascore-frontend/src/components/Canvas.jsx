import React from 'react';
import { useStore } from '../store/useStore';
import SortableBlock from './SortableBlock';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function Canvas() {
  const { blocks, moveBlock, activePage, viewport, setSelectedBlockId } = useStore();

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
    position: 'relative'
  };

  return (
    <div style={{ padding: viewport !== 'desktop' ? '40px 0' : '0', minHeight: '100%', display: 'flex', justifyContent: 'center' }} onClick={() => setSelectedBlockId(null)}>
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
