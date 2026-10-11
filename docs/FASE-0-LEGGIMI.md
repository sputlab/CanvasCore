# CanvasCore — Fase 0 (punto zero stabile)

Questo pacchetto rende l'app **funzionante end-to-end** e chiude le falle di
sicurezza che vivevano nei file riscritti. Sotto trovi cosa sostituire, cosa
cancellare e come verificare.

## 1. File da SOSTITUIRE

Backend (`public/canvascore-admin/`)
- `api.php`          → schema draft/publish completo, azioni mancanti, hardening
- `rebuild_all.php`  → query coerente col nuovo schema, routing via clean_slug
- `submit_form.php`  → destinatario solo server-side (niente open relay), output escapato

Frontend (`public/canvascore-frontend/`)
- `src/store/useStore.js`              → moveBlock reale, isEditingMaster/exitMasterEditMode
- `src/components/SortableBlock.jsx`   → drag & drop funzionante a ogni livello
- `src/components/UserManager.jsx`     → JSX ricostruito (l'originale era troncato)
- `package.json`                       → rimossa dipendenza morta react-simple-wysiwyg

NB: `compiler.php` e `master.html` NON sono stati toccati (funzionano). Qui li
trovi solo per comodità di riferimento.

## 2. File da CANCELLARE (codice morto)

    public/canvascore-frontend/src/store/useEditorStore.js
    public/canvascore-frontend/src/components/MenuManager.jsx
    public/canvascore-frontend/src/components/SiteSettings.jsx

Poi rimuovi la dipendenza morta:

    cd canvascore-frontend
    npm remove react-simple-wysiwyg

## 3. Rebuild del frontend

    cd canvascore-frontend
    npm install
    npm run build      # genera /dist

Carica il contenuto di `dist/` nella cartella `canvascore-admin/` (dove gira
l'editor) oppure servila dove preferisci: l'editor parla con `api.php` e
`rebuild_all.php` tramite path relativi.

## 4. Primo avvio

1. Apri l'editor nel browser.
2. Login con **admin / admin** (creato in automatico al primo avvio).
3. **Cambia subito la password** da "Account".
4. Crea una pagina con slug `index`, trascina qualche blocco, "Publish Online".
5. Verifica che venga generato `index.html` nella root del sito.

## 5. Cosa è stato corretto

### Bug bloccanti
- La pubblicazione non funzionava più (colonne `is_draft_copy`/`status`
  mancanti): ora lo schema è completo e migrato in automatico.
- Flusso draft → copia nascosta → publish → discard: implementato lato server
  e allineato a ciò che il frontend già si aspettava (`new_id`, `clean_slug`,
  `draft_copy`, `discard_draft`, `force_password`).
- `moveBlock` era un no-op: ora il riordino dei blocchi funziona (tra fratelli,
  a qualsiasi livello dell'albero).
- `UserManager.jsx` non compilava (JSX troncato): ricostruito.
- Rimosso codice morto che poteva crashare (`useEditorStore.js` usa una
  sintassi Zustand non più valida).

### Sicurezza (inclusa perché vive in questi stessi file)
- **Upload RCE**: whitelist di estensioni immagine + verifica `getimagesize` +
  `.htaccess` che disabilita l'esecuzione PHP in `/uploads`.
- **SQL injection** nel rename slug: ora prepared statement.
- **Path traversal** nella generazione file: slug sanitizzato `[a-z0-9-]`.
- **Open relay** nel form mailer: il destinatario viene preso SOLO dalle
  impostazioni globali server-side, mai dal client.
- **XSS riflesso** nel form mailer: messaggi escapati.
- `.htaccess` in `/data` per non far scaricare il DB (Apache).
- `session_regenerate_id` al login (anti session-fixation).

## 6. Limiti noti — restano per le Fasi 1-2 (come concordato)

Queste cose funzionano ma vanno irrobustite dopo:
- **Protezione `/data` e `/uploads` su Nginx**: gli `.htaccess` valgono solo su
  Apache. Su Nginx va spostata `data/` fuori dalla webroot o aggiunta una
  `location` di deny. **Finché non lo fai, su Nginx il DB è scaricabile.**
- **XSS stored** nei blocchi HTML/GRID/CARDS/Custom CSS: il compiler emette
  ancora quel contenuto raw (è il comportamento voluto per il blocco "HTML",
  ma va incapsulato/filtrato). Da affrontare in Fase 1.
- **Email per-form**: per chiudere l'open relay il destinatario è ora globale.
  Il destinatario per singolo form tornerà in Fase 1 via registry server-side.
- **Drag & drop tra contenitori diversi**: oggi il riordino avviene tra
  fratelli nello stesso contenitore. Lo spostamento cross-container richiede
  droppable dedicati (Fase 2).
- **CSRF token**, forzatura cambio password al primo login: Fase 1.
- Bundle da ~1.1 MB (Jodit pesante), stili inline, schema blocco unico
  editor/compiler: Fase 2.
