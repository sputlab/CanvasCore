# CanvasCore 0.6.1 — ritocchi richiesti

## File da sostituire
Frontend: `src/components/PageManager.jsx`, `src/components/Login.jsx`,
`src/components/PropertyPanel.jsx`
Backend: `canvascore-admin/version.json`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Modifiche
- "CanvasCore Pro" → "CanvasCore" (login) e "Custom Code (Pro)" → "Custom Code".
- Icone Export/Import invertite nella toolbar della dashboard.
- Nuovo pulsante ⧉ nella lista pagine per aprire la pagina pubblicata in una
  nuova scheda. (Funziona per le pagine già pubblicate: apre `../<slug>/` o la
  root per la homepage.)
- Colonna azioni allargata per i tre pulsanti + hover sulle righe.

## Nota
Il restyle UI/UX "premium" completo (design token + libreria componenti) è un
intervento dedicato: vedi la feature #6/#UI nella lista delle 30. Questo giro
contiene solo ritocchi sicuri e le modifiche richieste.
