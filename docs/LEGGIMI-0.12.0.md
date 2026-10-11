# CanvasCore 0.12.0 — Sessione scaduta: il lavoro è al sicuro

## Cosa risolve
Prima, se la sessione scadeva mentre lavoravi, non succedeva nulla finché non provavi a salvare; a
quel punto "Draft saved!" poteva comparire anche se non era stato salvato nulla, oppure venivi
riportato al login perdendo lo stato. Ora:

1. **La scadenza è prevedibile**: il server la impone dopo N minuti di inattività (default 30).
   Lavorare nell'interfaccia conta come attività.
2. **Te ne accorgi subito**, non al salvataggio: anche tornando su una scheda rimasta in background.
   Poco prima della scadenza compare un avviso con "Stay signed in".
3. **Il login compare sopra l'app**, che resta intatta: dopo l'accesso riprendi esattamente da dove eri.
4. **Il salvataggio interrotto viene completato** da solo dopo il login (una volta sola).
5. **Backup locale** automatico del lavoro non salvato: anche con refresh o scheda chiusa lo ritrovi
   ("Unsaved work found" → Restore/Discard).
6. **Niente più falsi successi**: l'esito di Save/Publish è quello reale.

## File NUOVI
- `canvascore-frontend/src/session/` (drafts, draftTrackers, sessionManager, fetchGuard, runtime, hooks)
- `src/components/` SessionExpiredOverlay, SessionWarning, DraftRestorePrompt, EditorDraftStatus
- `tests/session.mjs`, `tests/session-ui.mjs`, `tests/stubs/jodit-react.jsx`

## File da SOSTITUIRE
Backend: `canvascore-admin/config.php`, `api.php`, `rebuild_all.php`, `version.json`
Frontend: `package.json`, `src/apiClient.js`, `src/App.jsx`, `src/store/useStore.js`,
`src/components/Login.jsx`, `VisualEditor.jsx`, `MenuBuilder.jsx`, `GlobalSettings.jsx`
Più `CHANGELOG.md`.

```
cd canvascore-frontend
npm install     # nessuna nuova dipendenza rispetto alla 0.11.0 (jsdom c'era già)
npm run build
npm test
```
Nessuna migrazione DB.

## Da sapere prima di aggiornare
- **Tutti gli utenti dovranno rifare il login una volta**: le sessioni passano in una cartella dedicata
  (`<data dir>/sessions`, permessi 0700). Su Nginx la data dir va già protetta come da istruzioni
  precedenti; non servono regole nuove.
- **Timeout**: Global Options → Security → "Session timeout" (5–720 minuti).
- I backup stanno nel browser, **per utente**: non seguono l'utente su un altro dispositivo e si
  eliminano dopo 14 giorni. Se il browser blocca il localStorage o è pieno, l'interfaccia lo segnala
  (in quel caso non chiudere la scheda: il lavoro è ancora nella finestra).
- Non c'è rilevamento di conflitti: se un'altra persona modifica la stessa pagina nel frattempo,
  vince l'ultimo salvataggio (come già prima).
- Se alla scadenza accede un utente diverso, la scheda si ricarica da zero e non esegue nulla a suo nome.

## Come è stato verificato
- Server, sul vero `api.php` con orologio simulato: scadenza esatta (1799 s sì, 1801 s no), `session_status`
  che non allunga la sessione, `keepalive`, 401 prima di CSRF, timeout configurabile e limitato.
- Client: 150 controlli su backup, tracker, gestore (ore di sessione simulate), guardia sulle fetch.
- Integrazione: la vera `App` in jsdom contro un backend finto (49 controlli): scrivo, la sessione scade,
  premo Save → login sopra l'app → ri-login → il salvataggio avviene una sola volta con il token nuovo.
- **Test di mutazione**: bug piantati di proposito, tutti rilevati. Ha rivelato difetti nei miei stessi
  test e un bug reale (il lavoro di un utente poteva finire nel backup di un altro).

## Non verificato
L'aspetto reale in un browser vero (in particolare il comportamento dell'attributo `inert` che blocca
l'app dietro il login) e l'esecuzione su un hosting reale. Prova in particolare: lascia una scheda ferma
oltre il timeout, poi tornaci e premi Save.
