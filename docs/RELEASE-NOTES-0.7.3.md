# CanvasCore 0.7.3 — UI refresh pass 2: editor

## File da SOSTITUIRE
Frontend: `src/components/VisualEditor.jsx`, `src/components/PropertyPanel.jsx`
Backend: `canvascore-admin/version.json`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Cosa cambia nell'editor
- **Blocchi in griglia 2 colonne**: il pannello "ADD" mostra ora i blocchi come
  tile compatte (icona + etichetta breve), molto più dense e ordinate. Si vede
  più roba senza scrollare.
- **Pannelli più stretti** (sinistra 250px, destra 300px) → più spazio al canvas,
  utile sui 14".
- **Spaziature ridotte** ovunque: barra fluttuante, accordion, header del pannello
  proprietà, barra Save/Publish, e meno padding attorno al canvas.
- Etichette dei blocchi accorciate per leggibilità.

## Importante
Il **rendering dei blocchi nel canvas non è stato toccato** (è sotto test di
parità): è cambiata solo la "cornice" dell'editor. L'anteprima resta identica al
sito pubblicato.

## Da validare
Apri l'editor e guarda: la griglia dei blocchi, la larghezza dei pannelli e la
densità generale. Dimmi se è il punto giusto o se stringere/allargare. Se ti
convince, la pass UI è sostanzialmente completa e possiamo passare allo **Step A**
(licenza + installer + docs) per sigillare il progetto, oppure rifinire altre
schermate.
