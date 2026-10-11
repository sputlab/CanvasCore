# CanvasCore — Fix salvataggio (post Fase 1)

Su installazioni aggiornate (non pulite) i salvataggi potevano fallire mentre le
letture funzionavano. Due cause, entrambe risolte in `config.php` (+ un ritocco a
`apiClient.js`).

## File da sostituire
- `canvascore-admin/config.php`
- `canvascore-frontend/src/apiClient.js`  → poi `npm run build`

## Cosa è stato corretto

1) **CSRF robusto (double-submit).** La tua sessione era nata prima della Fase 1:
   col cambio dei parametri cookie il token in sessione poteva non essere più
   visibile nella richiesta di salvataggio → 403 su tutte le POST. Ora il token
   viaggia anche in un cookie `cc_csrf` (SameSite=Lax) e la verifica accetta il
   match su sessione OPPURE su cookie. È sicuro (SameSite + same-origin) e non
   dipende più dalla persistenza perfetta della sessione.
   Inoltre ho rimosso il blocco rigido su Origin (falsi positivi dietro proxy/CDN):
   la difesa resta solida grazie a token + SameSite.

2) **Data dir con test di scrittura reale + migrazione bidirezionale.** Se la
   cartella esterna `canvascore-data/` risultava leggibile ma non scrivibile
   dall'utente del web server, le letture funzionavano e le scritture no. Ora la
   sede dei dati viene scelta con un test di scrittura effettivo e, se serve, i
   dati vengono riportati automaticamente dove si può scrivere (anche tornando in
   `canvascore-admin/data/` protetta da .htaccess). Nessuna perdita di dati.

## IMPORTANTE dopo l'aggiornamento
- Ricompila il frontend (`npm run build`) e **ricarica con hard refresh**
  (Ctrl/Cmd+Shift+R) per scaricare il nuovo bundle: se il browser serve ancora il
  vecchio JS, i salvataggi falliranno comunque perché il vecchio codice non invia
  il token CSRF.
- Se un salvataggio fallisse ancora, apri gli strumenti sviluppatore → Rete,
  guarda la risposta di `save_page`: il messaggio dice esattamente la causa
  ("Invalid CSRF token" = bundle vecchio in cache / token mancante).
