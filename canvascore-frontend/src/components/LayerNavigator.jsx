import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, Trash2, Box, Columns, Type, Image, SquareChartGantt, Layers, GripVertical } from 'lucide-react';

const getIconForType = (type) => {
  switch (type) {
    case 'SECTION': return <Box size={12} color="#38bdf8" />;
    case 'CONTAINER': return <Box size={12} color="#f472b6" />;
    case 'FLEX_ROW': return <Columns size={12} color="#a78bfa" />;
    case 'CSS_GRID': return <Columns size={12} color="#38bdf8" />;
    case 'TEXT': return <Type size={12} color="#94a3b8" />;
    case 'IMAGE': return <Image size={12} color="#94a3b8" />;
    case 'BUTTON': return <SquareChartGantt size={12} color="#94a3b8" />;
    default: return <Layers size={12} color="#94a3b8" />;
  }
};

// Tutti gli id in ordine di visita (per il SortableContext piatto)
const flattenIds = (blocks) => {
  const out = [];
  const walk = (list) => list.forEach(b => { out.push(b.id); if (b.children) walk(b.children); });
  walk(blocks);
  return out;
};

const LayerNode = ({ block, depth = 0 }) => {
  const { selectedBlockId, setSelectedBlockId, removeBlock } = useStore();
  const isSelected = selectedBlockId === block.id;
  const isContainer = block.children !== undefined;
  const [isOpen, setIsOpen] = useState(true);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
        style={{
          display: 'flex', alignItems: 'center', padding: '6px 10px',
          paddingLeft: `${depth * 15 + 6}px`,
          background: isSelected ? '#1e293b' : (isOver ? '#13233b' : 'transparent'),
          borderLeft: isSelected ? '3px solid #38bdf8' : '3px solid transparent',
          borderTop: isOver && isContainer ? '1px dashed #38bdf8' : '1px solid transparent',
          cursor: 'pointer', color: isSelected ? '#f8fafc' : '#cbd5e1',
          fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)'
        }}
      >
        <span {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} title="Drag to move"
          style={{ cursor: 'grab', color: '#475569', display: 'flex', marginRight: '2px' }}>
          <GripVertical size={12} />
        </span>

        <div style={{ width: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
          {isContainer ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {getIconForType(block.type)}
          <span style={{ fontWeight: isContainer ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {block.content?.customId ? `#${block.content.customId}` : block.type}
          </span>
        </div>

        {isSelected && (
          <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {isContainer && isOpen && block.children && block.children.length > 0 && (
        <div style={{ borderLeft: '1px solid #334155', marginLeft: `${depth * 15 + 14}px` }}>
          {block.children.map(child => <LayerNode key={child.id} block={child} depth={0} />)}
        </div>
      )}
    </div>
  );
};

export default function LayerNavigator() {
  const { blocks, selectedBlockId, addBlock, moveBlock } = useStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) moveBlock(active.id, over.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a' }}>
      <div style={{ padding: '11px 12px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '800', letterSpacing: '1px' }}>DOM NAVIGATOR</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {blocks.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Tree is empty. Add a section.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={flattenIds(blocks)}>
              {blocks.map(block => <LayerNode key={block.id} block={block} depth={0} />)}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div style={{ padding: '11px 12px', borderTop: '1px solid #1e293b', background: '#1e293b' }}>
        <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
          {selectedBlockId ? 'Add inside selected:' : 'Add to root:'}
        </p>
        <p style={{ margin: '0 0 10px 0', fontSize: '10px', color: '#64748b' }}>Tip: drag <GripVertical size={10} style={{ verticalAlign: 'middle' }} /> to reorder or move between containers.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={() => addBlock('SECTION', selectedBlockId)} style={{ padding: '6px', background: '#0f172a', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Section</button>
          <button onClick={() => addBlock('CONTAINER', selectedBlockId)} style={{ padding: '6px', background: '#0f172a', color: '#f472b6', border: '1px solid #334155', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Container</button>
          <button onClick={() => addBlock('FLEX_ROW', selectedBlockId)} style={{ padding: '6px', background: '#0f172a', color: '#a78bfa', border: '1px solid #334155', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>+ Flex Row</button>
          <button onClick={() => addBlock('TEXT', selectedBlockId)} style={{ padding: '6px', background: '#0f172a', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>+ Text</button>
        </div>
      </div>
    </div>
  );
}
