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
  syncPackageVersion(v.app);
} catch (e) {
  console.warn('bump.mjs: impossibile aggiornare version.json:', e.message);
}

// Allinea "version" di package.json e package-lock.json a version.json (app).
function syncPackageVersion(app) {
  if (!app) return;
  for (const rel of ['../package.json', '../package-lock.json']) {
    const file = fileURLToPath(new URL(rel, import.meta.url));
    try {
      const pkg = JSON.parse(readFileSync(file, 'utf-8'));
      if (pkg.version === app && (!pkg.packages?.[''] || pkg.packages[''].version === app)) continue;
      pkg.version = app;
      if (pkg.packages?.['']) pkg.packages[''].version = app;
      writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`bump.mjs: ${rel.slice(3)} → ${app}`);
    } catch (e) {
      console.warn(`bump.mjs: impossibile aggiornare ${rel.slice(3)}:`, e.message);
    }
  }
}
