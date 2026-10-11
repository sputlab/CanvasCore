// Auto-bump: increments the build number and stamps the date on every `npm run build`.
// The semantic version (app) remains the source of truth for releases.
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
  console.warn('bump.mjs: could not update version.json:', e.message);
}

// Aligns "version" in package.json and package-lock.json with version.json (app).
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
      console.warn(`bump.mjs: could not update ${rel.slice(3)}:`, e.message);
    }
  }
}
