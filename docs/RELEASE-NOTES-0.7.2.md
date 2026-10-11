# CanvasCore 0.7.2 — densità alta + dashboard riorganizzata

## File da SOSTITUIRE
Frontend: `src/components/PageManager.jsx`, `GlobalSettings.jsx`,
`MediaManager.jsx`, `MenuBuilder.jsx`, `Submissions.jsx`, `Templates.jsx`,
`UserManager.jsx`, `PropertyPanel.jsx`
Backend: `canvascore-admin/version.json`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

(Richiede anche `src/ui/global.css` dalla 0.7.1, se non l'hai già applicata.)

## Cosa cambia
- **Densità molto più alta**: padding dei contenitori più stretti e **campi
  input/label più compatti** (meno altezza, font 12–13px) nelle schermate di
  form. Più contenuto utile a schermo sui portatili 14" FHD.
- **Dashboard riorganizzata** come richiesto:
  - pillola utente (nome + ruolo) **in alto a sinistra**, con **Logout** accanto;
  - azioni primarie (New Page, Publish All) in alto a destra;
  - navigazione secondaria in una barra compatta dedicata (pulsanti più piccoli);
  - "Account" → **"Accounts"**.

## Da validare
Guarda la dashboard sul tuo monitor e dimmi se la densità è giusta: posso
stringere ancora o allentare di un filo. Se ti va bene, passiamo alla **pass 2**
con il rifacimento dell'editor (barra, pannelli, canvas) sulla stessa linea di
densità ed eleganza.
