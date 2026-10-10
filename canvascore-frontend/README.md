# canvascore-frontend

Editor visuale di CanvasCore (React 19, Vite, Zustand, dnd-kit).
Vedi il [README principale](../README.md) per struttura, sviluppo e deploy.

| Comando          | Descrizione                                                    |
| ---------------- | -------------------------------------------------------------- |
| `npm run dev`    | Server di sviluppo Vite                                        |
| `npm run build`  | Build in `dist/` (prima incrementa il build in `version.json`) |
| `npm run lint`   | oxlint                                                         |
| `npm test`       | Tutti i test (richiede il PHP CLI per la parità JS↔PHP)       |

Versione e default dei blocchi sono letti da `../canvascore-admin/version.json` e
`../canvascore-admin/blocks.json` (vedi `vite.config.js`).
