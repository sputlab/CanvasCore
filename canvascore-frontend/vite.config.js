import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Single source of truth: canvascore-admin/version.json and blocks.json (PHP side).
function readJson(rel, fallback) {
  try { return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8')) }
  catch { return fallback }
}
const version = readJson('../canvascore-admin/version.json', { app: '0.0.0', build: 0 })
const blockDefs = readJson('../canvascore-admin/blocks.json', { _baseStyles: {}, types: {} })

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version.app || '0.0.0'),
    __APP_BUILD__: JSON.stringify(version.build || 0),
    __BLOCK_DEFS__: JSON.stringify(blockDefs),
  },
})
