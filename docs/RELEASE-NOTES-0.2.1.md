# CanvasCore 0.2.1 — fix ruolo editor + CSRF lifecycle

## File da sostituire
- `canvascore-admin/api.php`
- `canvascore-admin/version.json`
- `CHANGELOG.md`

(Nessun rebuild del frontend strettamente necessario: le modifiche sono backend.
Se però vuoi aggiornare il numero di build mostrato, lancia comunque `npm run build`.)

## Cosa cambia
1. **Cambio password forzato per i nuovi utenti.** `add_user` ora imposta
   `must_change_pw=1`: al primo login il nuovo editor/admin viene obbligato a
   scegliere una nuova password. Anche il reset password dall'area Account
   (`force_password`) forza il cambio al successivo accesso dell'utente.

2. **CSRF robusto nei cambi utente.** Il login allinea il cookie double-submit
   `cc_csrf` al token di sessione appena generato e il logout lo cancella. Così,
   passando da un utente all'altro nello stesso browser, non resta un token
   "vecchio" che possa far rifiutare le richieste POST (salvataggio pagina,
   upload immagine, ecc.).

## Nota sul bug 2 (alcune funzioni della dashboard)
Nei test lato server tutte le operazioni dell'editor (creare pagina, salvare
menu, eliminare media) funzionano correttamente: non è un blocco di permessi.
La causa più probabile di "alcune POST non funzionano dopo essere entrati come
utente diverso" è proprio il token CSRF stantio, ora risolto dal punto 2.

Dopo l'aggiornamento: **logout e login di nuovo**, poi hard refresh
(Ctrl/Cmd+Shift+R). Se una funzione dovesse ancora fallire, apri DevTools → Rete,
guarda la risposta della chiamata che fallisce (`save_page` o `upload_media`): il
messaggio dirà la causa esatta (es. "Invalid CSRF token").
