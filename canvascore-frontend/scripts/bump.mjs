// Auto-bump: incrementa il numero di build e marca la data a ogni `npm run build`.
// La versione semantica (app) resta la fonte di verità per le release.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = fileURLToPath(new URL('../../canvascore-admin/version.json', import.meta.url));
try {
  const v = JSON.parse(readFileSync(path, 'utf-8'));
  v.build = (v.build || 0) + 1;
  v.built = new Date().toISOString();
  writeFileSync(path, JSON.stringify(v, null, 2) + '\n');
  console.log(`CanvasCore ${v.app} — build ${v.build} (${v.built})`);
} catch (e) {
  console.warn('bump.mjs: impossibile aggiornare version.json:', e.message);
}
