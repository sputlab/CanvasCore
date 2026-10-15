// Starter page templates (canvascore-admin/starters.json, served by api.php?action=get_starters): shared by the
// Templates screen (new pages) and Collections (new items).
import { blockLabel, CONTAINER_TYPES } from './blockCatalog';

// The block tree with fresh ids, so a starter used twice never repeats an id
let seq = 0;
export const regenIds = (node) => {
  const n = { ...node, id: 'block-' + Date.now() + '-' + (seq++) };
  if (node.children) n.children = node.children.map(regenIds);
  return n;
};
export const starterBlocks = (starter) => (starter && Array.isArray(starter.blocks) ? starter.blocks : []).map(regenIds);

// What a starter contains (content blocks, not their containers), as a quick outline
export const starterOutline = (st) => {
  const out = [];
  const walk = (list) => (list || []).forEach((b) => { if (!CONTAINER_TYPES.includes(b.type) && !out.includes(blockLabel(b.type))) out.push(blockLabel(b.type)); walk(b.children); });
  walk(st.blocks);
  return out.slice(0, 7);
};

export const fetchStarters = () => fetch('api.php?action=get_starters').then((r) => r.json()).then((d) => (Array.isArray(d) ? d : [])).catch(() => []);
