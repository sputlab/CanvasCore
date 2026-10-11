# CanvasCore — Fase 1 (hardening di sicurezza)

Questo giro chiude le falle di sicurezza rimaste dopo la Fase 0. Tutto è stato
collaudato: sanitizer XSS, CSRF/same-origin, migrazione data dir, cambio
password forzato, code-stripping per i non-admin, registry email dei form.

## 1. File NUOVI da aggiungere

Backend:
- `canvascore-admin/config.php`  ← modulo condiviso (sessione, CSRF, data dir, sanitizer)

Frontend:
- `canvascore-frontend/src/apiClient.js`                    ← wrapper fetch che inietta il token CSRF
- `canvascore-frontend/src/components/ForcePasswordChange.jsx` ← schermata cambio password forzato

## 2. File da SOSTITUIRE

Backend (`canvascore-admin/`)
- `api.php`         → include config, gate CSRF, must_change_pw, change_own_password, code-strip non-admin
- `rebuild_all.php` → usa la data dir condivisa, scrive il registry dei form
- `compiler.php`    → sanitizza i contenuti rich-text, blinda il custom CSS, form via registry (no email nel client)
- `submit_form.php` → destinatario solo server-side (registry per-form + fallback globale)

Frontend (`canvascore-frontend/`)
- `src/main.jsx`                       → importa apiClient per primo
- `src/App.jsx`                        → gate del cambio password forzato
- `src/store/useStore.js`              → salva csrf, must_change_pw, azione changeOwnPassword
- `src/components/VisualEditor.jsx`    → blocco "Custom HTML" visibile solo agli admin
- `src/components/PropertyPanel.jsx`   → pannello "Custom Code" visibile solo agli admin

Poi:

    cd canvascore-frontend && npm install && npm run build

## 3. IMPORTANTE — la data dir si sposta fuori dalla webroot

Al primo caricamento, `config.php` sposta automaticamente il database e i file
di configurazione da `canvascore-admin/data/` a **`canvascore-data/`** un livello
SOPRA la webroot (cioè accanto a `public/`, non dentro). La migrazione:
- copia `canvascore.sqlite`, `settings.json`, `menu.json`, `forms.json`;
- rimuove il DB dalla vecchia posizione dentro la webroot;
- se la cartella esterna non è scrivibile (hosting che blocca la scrittura
  sopra la docroot), resta in `data/` con l'`.htaccess` di protezione.

Struttura risultante tipica:

    tuosito/
    ├── canvascore-data/        ← DB e config, NON accessibili dal web
    │   └── canvascore.sqlite
    └── public/                 ← webroot
        ├── index.html
        ├── uploads/
        └── canvascore-admin/

Se la tua webroot non è `public/` ma la radice del dominio, verifica dove
finisce `canvascore-data/` e che non sia raggiungibile via URL.

## 4. Nginx — proteggere data e uploads

Gli `.htaccess` valgono solo su Apache. Su **Nginx** aggiungi al server block:

    # Nega qualsiasi accesso diretto alla cartella dei dati (se restasse in webroot)
    location ~* /canvascore-admin/data/ { deny all; return 404; }

    # Blocca l'esecuzione di script caricati come "immagini"
    location ~* /uploads/.*\.(php|phtml|phar|pl|py|cgi|sh)$ { deny all; return 404; }

Se `canvascore-data/` è fuori dalla webroot (default dopo la migrazione) non è
raggiungibile via URL e la prima regola è solo una rete di sicurezza.

## 5. Cosa è stato irrobustito

- **CSRF**: token legato alla sessione, inviato dal client via header
  `X-CSRF-Token` (iniettato automaticamente da `apiClient.js`). Tutte le POST
  che modificano stato lo richiedono; in più c'è un controllo same-origin.
  Collaudato: POST senza token → 403; Origin esterno → 403.
- **Sessione**: cookie `HttpOnly`, `SameSite=Lax`, `Secure` in HTTPS;
  rigenerazione dell'ID al login.
- **Cambio password forzato**: l'admin di default (admin/admin) è obbligato a
  impostare una nuova password (min 8 caratteri) al primo accesso. Vale anche
  per installazioni esistenti che usano ancora admin/admin.
- **XSS stored**: i contenuti rich-text (testo, hero, image+text, grid, cards,
  titolo form) passano per un sanitizer allow-list che rimuove
  `<script>`/`<iframe>`, gli handler `on*`, gli URL `javascript:` e le
  `url(javascript:)` negli stili. Il custom CSS non può più uscire dal tag
  `<style>`.
- **Blocchi "codice" ristretti agli admin**: gli utenti con ruolo *editor* non
  possono più salvare blocchi HTML o CSS custom — vengono rimossi lato server,
  a prescindere dall'interfaccia (i pulsanti sono comunque nascosti per loro).
- **Email dei form sicura**: il destinatario non viaggia più nel client. La
  build scrive un registry `forms.json` (id form → email) e `submit_form.php`
  risolve il destinatario da lì, con fallback all'email globale. Niente più
  open relay, ma il destinatario per-form è di nuovo supportato.

## 6. Note

- Il sanitizer usa `ext-dom` (DOMDocument), presente nella quasi totalità degli
  hosting PHP. In sua assenza c'è un fallback a regex più conservativo.
- Il blocco "HTML" resta uno strumento potente per gli **admin** (come il
  Custom HTML di WordPress / il widget HTML di Elementor): è codice fidato per
  definizione. Per questo è riservato agli admin e precluso agli editor.

## 7. Prossimi passi (Fase 2 — fondamenta per scalare)

Non sicurezza, ma debito tecnico da ripagare prima di aggiungere molte feature:
design token + libreria UI (via gli stili inline), schema di blocco unico con
rendering condiviso editor/compiler (oggi duplicato), code-splitting del bundle,
versioni dipendenze riproducibili, LICENSE + README + test.
