# CanvasCore 0.3.0 — Menu Builder avanzato + utente in dashboard

## File da sostituire
Backend: `canvascore-admin/compiler.php`, `api.php`, `version.json`
Frontend: `src/components/MenuBuilder.jsx`, `src/components/PageManager.jsx`,
`src/store/useStore.js`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Novità principali
- **Bug sottomenu risolto**: il Menu Builder ora usa un vero albero annidato.
  Riordino e annidamento (⇥ annida sotto il precedente, ⇤ dis-annida) sono
  coerenti e persistono correttamente. Riordino anche in **drag & drop** tra
  voci dello stesso livello.
- **Voce senza link**: lascia l'URL vuoto e la voce padre aprirà solo il
  sottomenu (nessun href), utile quando non c'è una pagina per il livello padre.
- **Sottomenu multilivello** con dropdown a cascata.
- **Personalizzazioni grafiche**: bordi voci, spaziatura tra le voci, colore
  testo, colore testo/sfondo in hover, altezza barra, sfondo con **opacità**,
  ombra.
- **Logo**: immagine + altezza + allineamento indipendente dai pulsanti, con
  distanza configurabile. Logica di priorità come richiesto:
  - logo e pulsanti sullo **stesso lato** → accostati, a distanza "Logo/Buttons gap";
  - su **lati opposti** → logo e pulsanti agli estremi (space-between).
- **Effetti premium**: underline animata, lift, glassmorphism (blur), glare.
- **Anteprima live** del menu nel builder.
- **Dashboard**: in alto compare l'utente loggato (nome + ruolo).

## Compatibilità
I menu salvati nel vecchio formato (lista piatta con parentId) vengono convertiti
in automatico in albero annidato sia dall'editor sia dal compiler: nessuna
perdita di dati. Alla prima apertura del Menu Builder, salva per consolidare il
nuovo formato.

## Nota sugli effetti
"Glass" rende meglio con uno sfondo semi-trasparente (abbassa l'opacità dello
sfondo). "Glare" aggiunge un riflesso animato che scorre sulla barra.
