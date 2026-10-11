# canvascore-frontend

CanvasCore visual editor (React 19, Vite, Zustand, dnd-kit).
See the [main README](../README.md) for structure, development and deploy.

| Command          | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| `npm run dev`    | Vite development server                                           |
| `npm run build`  | Build into `dist/` (first increments the build in `version.json`) |
| `npm run lint`   | oxlint                                                            |
| `npm test`       | All tests (needs the PHP CLI for the JS↔PHP parity test)         |

The version and the block defaults are read from `../canvascore-admin/version.json` and
`../canvascore-admin/blocks.json` (see `vite.config.js`).
